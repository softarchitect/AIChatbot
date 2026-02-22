import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { addAuditLog, applyPlanToTenant } from "@/lib/server/state";

const schema = z.object({
  planId: z.string().min(2),
});

export async function POST(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "manage_tenants", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid apply plan payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const data = await applyPlanToTenant(tenantId, parsed.data.planId, { role: auth.role, tenantId });
    if (!data) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }
    await addAuditLog(
      {
        tenantId,
        actor: auth.name,
        actorEmail: auth.email,
        action: "tenant.plan_changed",
        target: data.tenant.name,
        details: { planId: parsed.data.planId },
      },
      { role: auth.role, tenantId }
    );
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply plan." },
      { status: 400 }
    );
  }
}
