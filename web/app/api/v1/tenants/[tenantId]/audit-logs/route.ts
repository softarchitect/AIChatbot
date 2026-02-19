import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { listAuditLogs } from "@/lib/server/state";

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const permissionError = requirePermission(auth, "view_audit_logs");
  if (permissionError) return permissionError;

  const { tenantId } = await context.params;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const { searchParams } = new URL(req.url);
  const actor = searchParams.get("actor")?.toLowerCase() ?? "";
  const action = searchParams.get("action")?.toLowerCase() ?? "";

  let logs = await listAuditLogs(tenantId);
  if (actor) {
    logs = logs.filter((l) => l.actor.toLowerCase().includes(actor));
  }
  if (action) {
    logs = logs.filter((l) => l.action.toLowerCase().includes(action));
  }

  return NextResponse.json({ data: logs });
}
