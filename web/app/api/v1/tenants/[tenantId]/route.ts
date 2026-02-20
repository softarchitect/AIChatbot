import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addAuditLog, deleteTenant, findTenantById, updateTenant } from "@/lib/server/state";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";

const updateSchema = z
  .object({
    name: z.string().min(2).optional(),
    domain: z.string().min(3).optional(),
    status: z.enum(["active", "inactive", "suspended"]).optional(),
    plan: z.enum(["free", "starter", "professional", "enterprise"]).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    customDomain: z.string().optional(),
    logoUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    headerText: z.string().optional(),
    welcomeMessage: z.string().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "At least one field is required.");

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const tenant = await findTenantById(tenantId, { role: auth.role, tenantId });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  return NextResponse.json({ data: tenant });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "manage_tenants", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateTenant(tenantId, parsed.data, { role: auth.role, tenantId });
  if (!updated) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  await addAuditLog({
    tenantId,
    actor: auth.name,
    actorEmail: auth.email,
    action: "tenant.updated",
    target: updated.name,
    details: parsed.data,
  }, { role: auth.role, tenantId });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "manage_tenants", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const deleted = await deleteTenant(tenantId, { role: auth.role, tenantId });
  if (!deleted) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  await addAuditLog({
    tenantId,
    actor: auth.name,
    actorEmail: auth.email,
    action: "tenant.deleted",
    target: deleted.name,
    details: { status: "suspended" },
  }, { role: auth.role, tenantId });

  return NextResponse.json({ data: deleted });
}
