import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@/lib/mock/data";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { addAuditLog, getTenantRolePermissions, setTenantRolePermissions } from "@/lib/server/state";

const roleSchema = z.object({
  admin: z.array(z.string()),
  supervisor: z.array(z.string()),
  agent: z.array(z.string()),
});

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const permissionError = await requirePermission(auth, "view_users", tenantId);
  if (permissionError) return permissionError;

  const data = await getTenantRolePermissions(tenantId, { role: auth.role, tenantId });
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const permissionError = await requirePermission(auth, "manage_roles", tenantId);
  if (permissionError) return permissionError;

  const body = await req.json().catch(() => null);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid roles payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const matrix = parsed.data as Record<Role, string[]>;
  const data = await setTenantRolePermissions(tenantId, matrix, { role: auth.role, tenantId });

  await addAuditLog(
    {
      tenantId,
      actor: auth.name,
      actorEmail: auth.email,
      action: "roles.permissions_updated",
      target: tenantId,
      details: { roles: Object.keys(matrix) },
    },
    { role: auth.role, tenantId }
  );

  return NextResponse.json({ data });
}
