import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { addAuditLog, listTenantFeatureFlags, updateTenantFeatureFlag } from "@/lib/server/state";

const updateFlagSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "view_feature_flags", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const data = await listTenantFeatureFlags(tenantId, { role: auth.role, tenantId });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "manage_feature_flags", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const body = await req.json().catch(() => null);
  const parsed = updateFlagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feature flag payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { key, enabled } = parsed.data;
  const flags = await updateTenantFeatureFlag(tenantId, key, enabled, { role: auth.role, tenantId });

  await addAuditLog({
    tenantId,
    actor: auth.name,
    actorEmail: auth.email,
    action: "feature_flag.toggled",
    target: key,
    details: { enabled },
  }, { role: auth.role, tenantId });

  return NextResponse.json({ data: flags });
}
