import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import {
  addAuditLog,
  countTenantAgents,
  createTenantUser,
  findTenantById,
  getPlatformTrialConfig,
  listTenantUsers,
} from "@/lib/server/state";
import type { Role } from "@/lib/mock/data";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "supervisor", "agent"]),
  password: z.string().min(8).optional(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = await context.params;

  const permissionError = await requirePermission(auth, "view_users", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const data = await listTenantUsers(tenantId, { role: auth.role, tenantId });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = await context.params;

  const permissionError = await requirePermission(auth, "edit_users", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid user payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const tenant = await findTenantById(tenantId, { role: auth.role, tenantId });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  if (tenant.plan === "free" && parsed.data.role === "agent") {
    const trial = await getPlatformTrialConfig();
    const currentAgents = await countTenantAgents(tenantId, { role: auth.role, tenantId });
    if (currentAgents >= trial.maxAgents) {
      return NextResponse.json(
        { error: `Trial agent limit reached (${trial.maxAgents}). Upgrade required.` },
        { status: 403 }
      );
    }
  }

  try {
    const user = await createTenantUser(
      tenantId,
      {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role as Role,
        password: parsed.data.password,
      },
      { role: auth.role, tenantId }
    );

    await addAuditLog(
      {
        tenantId,
        actor: auth.name,
        actorEmail: auth.email,
        action: "user.invited",
        target: parsed.data.email.toLowerCase(),
        details: { role: parsed.data.role },
      },
      { role: auth.role, tenantId }
    );

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
