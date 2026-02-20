import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { getTenantIntegrations, upsertTenantIntegration } from "@/lib/server/state";

const configSchema = z.object({
  provider: z.enum(["sendgrid", "dreams_sa"]),
  enabled: z.boolean().default(false),
  apiKey: z.string().optional().nullable(),
  fromEmail: z.string().email().optional().nullable(),
  senderId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "view_integrations", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const data = await getTenantIntegrations(tenantId, { role: auth.role, tenantId });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "manage_integrations", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const body = await req.json().catch(() => null);
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid integration config payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  if (payload.provider === "sendgrid" && payload.enabled && !payload.fromEmail) {
    return NextResponse.json({ error: "fromEmail is required when SendGrid is enabled." }, { status: 400 });
  }

  await upsertTenantIntegration(
    tenantId,
    payload.provider,
    {
      enabled: payload.enabled,
      apiKey: payload.apiKey ?? null,
      fromEmail: payload.fromEmail ?? null,
      senderId: payload.senderId ?? null,
    },
    { role: auth.role, tenantId }
  );

  const data = await getTenantIntegrations(tenantId, { role: auth.role, tenantId });
  return NextResponse.json({ data });
}
