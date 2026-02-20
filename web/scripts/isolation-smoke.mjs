const API_BASE = process.env.API_BASE ?? "http://localhost:3000";

function ensure(ok, message) {
  if (!ok) {
    throw new Error(message);
  }
}

function getToken(json, key) {
  return json?.[key] ?? json?.data?.[key] ?? null;
}

async function request(path, init = {}) {
  const response = await fetch(`${API_BASE}${path}`, init);
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function login(email, password) {
  const { response, json } = await request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  ensure(response.ok, `Login failed for ${email}`);
  const accessToken = getToken(json, "accessToken");
  ensure(!!accessToken, `Missing accessToken for ${email}`);
  return accessToken;
}

async function createTenantForAdmin(ownerToken, adminEmail) {
  const stamp = Date.now();
  const { response, json } = await request("/api/v1/tenants", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Isolation ${stamp}`,
      domain: `isolation-${stamp}.example.com`,
      language: "en",
      timezone: "UTC",
      plan: "starter",
      adminEmail,
    }),
  });
  ensure(response.ok, `Failed to create bootstrap tenant for ${adminEmail}`);
  const tenantId = json?.data?.id;
  ensure(!!tenantId, "Bootstrap tenant creation did not return id");
  return tenantId;
}

async function main() {
  console.log(`Running tenant isolation smoke tests against ${API_BASE}`);

  const ownerToken = await login("owner@saasphere.io", "password123");
  const ownerTenants = await request("/api/v1/tenants?page=1&perPage=50", {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  ensure(ownerTenants.response.ok, "Owner cannot list tenants");
  ensure(Array.isArray(ownerTenants.json?.data), "Owner tenants payload invalid");
  ensure(ownerTenants.json.data.length >= 2, "Need at least 2 tenants for isolation test");
  const allTenantIds = ownerTenants.json.data.map((t) => t.id).filter(Boolean);
  console.log(`OK: owner tenant list (${allTenantIds.length} tenants)`);

  const supervisorEmail = "super@acme.com";
  const supervisorToken = await login(supervisorEmail, "password123");
  let supervisorMe = await request("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${supervisorToken}` },
  });
  ensure(supervisorMe.response.ok, "Supervisor /auth/me failed");
  let supervisorTenantIds = supervisorMe.json?.tenantIds ?? [];
  if (!Array.isArray(supervisorTenantIds) || supervisorTenantIds.length === 0) {
    const newTenantId = await createTenantForAdmin(ownerToken, supervisorEmail);
    allTenantIds.push(newTenantId);
    supervisorMe = await request("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    ensure(supervisorMe.response.ok, "Supervisor /auth/me failed after bootstrap tenant creation");
    supervisorTenantIds = supervisorMe.json?.tenantIds ?? [];
  }
  ensure(Array.isArray(supervisorTenantIds) && supervisorTenantIds.length > 0, "Supervisor still has no tenant context");
  const allowedTenantId = supervisorTenantIds[0];
  const blockedTenantId = allTenantIds.find((id) => !supervisorTenantIds.includes(id));
  ensure(!!blockedTenantId, "Could not find a tenant outside supervisor scope");
  console.log(`OK: supervisor tenant scope detected (allowed=${allowedTenantId}, blocked=${blockedTenantId})`);

  const allowedChecks = [
    `/api/v1/tenants/${allowedTenantId}/feature-flags`,
    `/api/v1/tenants/${allowedTenantId}/audit-logs`,
    `/api/v1/tenants/${allowedTenantId}/conversations`,
  ];
  for (const path of allowedChecks) {
    const { response } = await request(path, {
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
        "x-tenant-id": allowedTenantId,
      },
    });
    ensure(response.ok, `Expected allowed access but failed: ${path} (status ${response.status})`);
  }
  console.log("OK: supervisor can access in-tenant resources");

  const blockedChecks = [
    `/api/v1/tenants/${blockedTenantId}/feature-flags`,
    `/api/v1/tenants/${blockedTenantId}/audit-logs`,
    `/api/v1/tenants/${blockedTenantId}/conversations`,
  ];
  for (const path of blockedChecks) {
    const { response } = await request(path, {
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
        "x-tenant-id": blockedTenantId,
      },
    });
    ensure(response.status === 403, `Expected 403 cross-tenant denial: ${path}, got ${response.status}`);
  }
  console.log("OK: supervisor cross-tenant access denied");

  const ownerChecks = [
    `/api/v1/tenants/${blockedTenantId}/feature-flags`,
    `/api/v1/tenants/${blockedTenantId}/audit-logs`,
    `/api/v1/tenants/${blockedTenantId}/conversations`,
    `/api/v1/tenants/${blockedTenantId}/campaigns`,
    `/api/v1/tenants/${blockedTenantId}/billing`,
    `/api/v1/tenants/${blockedTenantId}/agents`,
  ];
  for (const path of ownerChecks) {
    const { response } = await request(path, {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        "x-tenant-id": blockedTenantId,
      },
    });
    ensure(response.ok, `Owner should access tenant resource: ${path}, got ${response.status}`);
  }
  console.log("OK: owner can access tenant-scoped resources");

  const tenantHeaderMismatch = await request(`/api/v1/tenants/${allowedTenantId}/feature-flags`, {
    headers: {
      Authorization: `Bearer ${supervisorToken}`,
      "x-tenant-id": blockedTenantId,
    },
  });
  ensure(
    tenantHeaderMismatch.response.status === 400,
    `Expected 400 on tenant header/path mismatch, got ${tenantHeaderMismatch.response.status}`
  );
  console.log("OK: tenant header/path mismatch blocked");

  console.log("All isolation smoke tests passed.");
}

main().catch((error) => {
  console.error("Isolation smoke test failed:");
  console.error(error.message);
  process.exit(1);
});
