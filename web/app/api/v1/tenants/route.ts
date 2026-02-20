import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addAuditLog, addTenant, findTenantById, listTenants } from "@/lib/server/state";
import { requireAuth, requirePermission } from "@/lib/server/auth";

const createTenantSchema = z.object({
  name: z.string().min(2),
  domain: z.string().min(3),
  language: z.string().default("en"),
  timezone: z.string().default("UTC"),
  plan: z.enum(["free", "starter", "professional", "enterprise"]).default("starter"),
  adminEmail: z.string().email(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const permissionError = await requirePermission(auth, "view_tenants");
  if (permissionError) return permissionError;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const plan = searchParams.get("plan");
  const status = searchParams.get("status");
  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(searchParams.get("perPage") ?? "10");

  let result = auth.role === "admin"
    ? await listTenants({ role: auth.role })
    : (
        await Promise.all(
          auth.tenantIds.map((tenantId) => findTenantById(tenantId, { role: auth.role, tenantId }))
        )
      ).filter((tenant): tenant is NonNullable<typeof tenant> => Boolean(tenant));
  if (search) {
    result = result.filter(
      (t) => t.name.toLowerCase().includes(search) || t.domain.toLowerCase().includes(search)
    );
  }
  if (plan && plan !== "all") {
    result = result.filter((t) => t.plan === plan);
  }
  if (status && status !== "all") {
    result = result.filter((t) => t.status === status);
  }

  const offset = (Math.max(1, page) - 1) * Math.max(1, perPage);
  const data = result.slice(offset, offset + perPage);

  return NextResponse.json({
    data,
    pagination: {
      total: result.length,
      page,
      perPage,
      totalPages: Math.ceil(result.length / Math.max(1, perPage)),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const permissionError = await requirePermission(auth, "manage_tenants");
  if (permissionError) return permissionError;

  const body = await req.json().catch(() => null);
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tenant payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const tenant = await addTenant(parsed.data, { role: auth.role });
    await addAuditLog({
      tenantId: tenant.id,
      actor: auth.name,
      actorEmail: auth.email,
      action: "tenant.created",
      target: tenant.name,
      details: { plan: tenant.plan, domain: tenant.domain },
    }, { role: auth.role });

    return NextResponse.json({ data: tenant }, { status: 201 });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "Tenant domain already exists. Please use a different domain." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create tenant. Please try again." },
      { status: 500 }
    );
  }
}
