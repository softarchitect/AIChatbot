import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { listTenantTeams, listUserTeamIdsForTenant } from "@/lib/server/state";

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "view_users", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  let data = await listTenantTeams(tenantId, { role: auth.role, tenantId });
  if (auth.role === "agent") {
    const teamIds = await listUserTeamIdsForTenant(auth.userId, tenantId);
    data = data.filter((team) => teamIds.includes(team.id));
  }

  return NextResponse.json({ data });
}
