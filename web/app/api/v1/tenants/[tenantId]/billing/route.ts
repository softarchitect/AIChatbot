import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { addAuditLog, addTenantBillingRecord, listTenantBillingRecords } from "@/lib/server/state";

const createBillingRecordSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  amount: z.number().nonnegative(),
  currency: z.string().min(3).max(3).default("USD"),
  status: z.enum(["due", "paid", "overdue"]).default("due"),
  dueAt: z.string(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "manage_billing", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const data = await listTenantBillingRecords(tenantId, { role: auth.role, tenantId });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "manage_billing", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const body = await req.json().catch(() => null);
  const parsed = createBillingRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid billing payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = await addTenantBillingRecord(tenantId, parsed.data, { role: auth.role, tenantId });
  await addAuditLog(
    {
      tenantId,
      actor: auth.name,
      actorEmail: auth.email,
      action: "billing.record_created",
      target: data.id,
      details: { amount: data.amount, currency: data.currency, status: data.status },
    },
    { role: auth.role, tenantId }
  );

  return NextResponse.json({ data }, { status: 201 });
}
