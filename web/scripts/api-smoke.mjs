const API_BASE = process.env.API_BASE ?? "http://localhost:3000";

function ensure(ok, message) {
  if (!ok) {
    throw new Error(message);
  }
}

async function post(path, body, headers = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function get(path, headers = {}) {
  const response = await fetch(`${API_BASE}${path}`, { headers });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function main() {
  console.log(`Running API smoke tests against ${API_BASE}`);

  const login = await post("/api/v1/auth/login", {
    email: "owner@saasphere.io",
    password: "password123",
  });
  ensure(login.response.ok, "Login failed");
  ensure(!!login.json.accessToken, "Missing access token");
  ensure(!!login.json.refreshToken, "Missing refresh token");
  const accessToken = login.json.accessToken;
  const refreshToken = login.json.refreshToken;
  console.log("OK: login");

  const me = await get("/api/v1/auth/me", {
    Authorization: `Bearer ${accessToken}`,
  });
  ensure(me.response.ok, "GET /auth/me failed");
  ensure(me.json.email === "owner@saasphere.io", "Unexpected /auth/me user");
  console.log("OK: me");

  const tenants = await get("/api/v1/tenants?page=1&perPage=5", {
    Authorization: `Bearer ${accessToken}`,
  });
  ensure(tenants.response.ok, "GET /tenants failed");
  ensure(Array.isArray(tenants.json.data), "Tenants response malformed");
  console.log("OK: tenants list");

  const rotate = await post("/api/v1/auth/refresh", { refreshToken });
  ensure(rotate.response.ok, "Token rotation failed");
  ensure(!!rotate.json.refreshToken, "Rotation did not return new refresh token");
  const newRefreshToken = rotate.json.refreshToken;
  console.log("OK: refresh rotation");

  const reuse = await post("/api/v1/auth/refresh", { refreshToken });
  ensure(reuse.response.status === 401, "Old refresh token reuse should fail with 401");
  console.log("OK: refresh reuse detection");

  const relogin = await post("/api/v1/auth/login", {
    email: "owner@saasphere.io",
    password: "password123",
  });
  ensure(relogin.response.ok, "Re-login after reuse detection failed");
  const secondAccessToken = relogin.json.accessToken;
  const secondRefreshToken = relogin.json.refreshToken;
  console.log("OK: re-login");

  const createTenant = await post(
    "/api/v1/tenants",
    {
      name: `Smoke Tenant ${Date.now()}`,
      domain: `smoke-${Date.now()}.example.com`,
      language: "en",
      timezone: "UTC",
      plan: "starter",
      adminEmail: "smoke-admin@example.com",
    },
    { Authorization: `Bearer ${secondAccessToken}` }
  );
  ensure(createTenant.response.ok, "POST /tenants failed");
  const tenantId = createTenant.json?.data?.id;
  ensure(!!tenantId, "Created tenant missing id");
  console.log("OK: tenant create");

  const logs = await get(`/api/v1/tenants/${tenantId}/audit-logs`, {
    Authorization: `Bearer ${secondAccessToken}`,
    "x-tenant-id": tenantId,
  });
  ensure(logs.response.ok, "GET /tenants/:tenantId/audit-logs failed");
  console.log("OK: tenant audit logs");

  const logout = await post("/api/v1/auth/logout", { refreshToken: secondRefreshToken });
  ensure(logout.response.ok, "Logout failed");
  console.log("OK: logout");

  const reuseNew = await post("/api/v1/auth/refresh", { refreshToken: newRefreshToken });
  ensure(reuseNew.response.status === 401, "Previously invalidated refresh should fail");
  console.log("OK: invalidated refresh token blocked");

  console.log("All API smoke tests passed.");
}

main().catch((error) => {
  console.error("API smoke test failed:");
  console.error(error.message);
  process.exit(1);
});
