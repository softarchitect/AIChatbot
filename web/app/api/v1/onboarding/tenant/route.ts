import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addAuditLog, addTenant, findApiKey } from "@/lib/server/state";
import { requireAuth, requirePermission } from "@/lib/server/auth";

const onboardingSchema = z.object({
  name: z.string().min(2),
  domain: z.string().min(3),
  adminEmail: z.string().email(),
  language: z.string().default("en"),
  timezone: z.string().default("UTC"),
  plan: z.enum(["free", "starter", "professional", "enterprise"]).default("starter"),
});

async function authorizeOnboarding(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const key = await findApiKey(apiKey);
    if (!key) {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }
    return {
      actor: "API Key",
      actorEmail: "api-key",
      authorized: true,
    };
  }

  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const permissionError = requirePermission(auth, "manage_tenants");
  if (permissionError) return permissionError;

  return {
    actor: auth.name,
    actorEmail: auth.email,
    authorized: true,
  };
}

export async function POST(req: NextRequest) {
  const authResult = await authorizeOnboarding(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const body = await req.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid onboarding payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const tenant = await addTenant(parsed.data);
  await addAuditLog({
    tenantId: tenant.id,
    actor: authResult.actor,
    actorEmail: authResult.actorEmail,
    action: "tenant.onboarding_created",
    target: tenant.name,
    details: { domain: tenant.domain, plan: tenant.plan },
  });

  return NextResponse.json({
    data: {
      tenantId: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      status: tenant.status,
    },
  }, { status: 201 });
}
