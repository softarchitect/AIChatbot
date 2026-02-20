import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { addAuditLog, addTenantCampaign, listTenantCampaigns } from "@/lib/server/state";

const createCampaignSchema = z.object({
  name: z.string().min(2),
  channel: z.enum(["whatsapp", "webchat", "sms", "email"]),
  status: z.enum(["draft", "active", "paused", "completed"]).default("draft"),
  budget: z.number().nonnegative().default(0),
  startDate: z.string(),
  endDate: z.string(),
  teamId: z.string().optional(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "view_analytics", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const data = await listTenantCampaigns(tenantId, { role: auth.role, tenantId }, auth.userId);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "manage_workflows", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const body = await req.json().catch(() => null);
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid campaign payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = await addTenantCampaign(tenantId, parsed.data, { role: auth.role, tenantId }, auth.userId);
    await addAuditLog(
      {
        tenantId,
        actor: auth.name,
        actorEmail: auth.email,
        action: "campaign.created",
        target: data.name,
        details: { channel: data.channel, budget: data.budget, status: data.status, teamId: data.teamId ?? null },
      },
      { role: auth.role, tenantId }
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    const status = message.includes("team") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
