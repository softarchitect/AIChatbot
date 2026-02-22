import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { getTenantSubscriptionSummary } from "@/lib/server/state";

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "view_tenants", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;
  const data = await getTenantSubscriptionSummary(tenantId, { role: auth.role, tenantId });
  if (!data) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }
  return NextResponse.json({ data });
}
