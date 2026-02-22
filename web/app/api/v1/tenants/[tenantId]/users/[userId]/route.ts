import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { addAuditLog, updateTenantUser } from "@/lib/server/state";
import type { Role } from "@/lib/mock/data";

const updateSchema = z.object({
  role: z.enum(["admin", "supervisor", "agent"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ tenantId: string; userId: string }> }
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, userId } = await context.params;

  const permissionError = await requirePermission(auth, "edit_users", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid user update payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = await updateTenantUser(
    tenantId,
    userId,
    {
      role: parsed.data.role as Role | undefined,
      active: parsed.data.active,
      password: parsed.data.password,
    },
    { role: auth.role, tenantId }
  );
  if (!data) {
    return NextResponse.json({ error: "User not found for this tenant." }, { status: 404 });
  }

  await addAuditLog(
    {
      tenantId,
      actor: auth.name,
      actorEmail: auth.email,
      action: "user.updated",
      target: data.email,
      details: { role: parsed.data.role, active: parsed.data.active },
    },
    { role: auth.role, tenantId }
  );

  return NextResponse.json({ data });
}
