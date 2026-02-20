import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, requireTenantAccess } from "@/lib/server/auth";
import { addAuditLog, addTenantConversation, listTenantConversations } from "@/lib/server/state";

const createConversationSchema = z.object({
  subject: z.string().min(2),
  channel: z.enum(["whatsapp", "webchat", "sms", "email"]),
  status: z.enum(["open", "closed", "pending"]).default("open"),
  teamId: z.string().optional(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "view_conversations", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const data = await listTenantConversations(tenantId, { role: auth.role, tenantId }, auth.userId);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { tenantId } = await context.params;
  const permissionError = await requirePermission(auth, "manage_conversations", tenantId);
  if (permissionError) return permissionError;
  const tenantError = requireTenantAccess(req, auth, tenantId);
  if (tenantError) return tenantError;

  const body = await req.json().catch(() => null);
  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid conversation payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = await addTenantConversation(tenantId, parsed.data, { role: auth.role, tenantId }, auth.userId);
    await addAuditLog(
      {
        tenantId,
        actor: auth.name,
        actorEmail: auth.email,
        action: "conversation.created",
        target: data.subject,
        details: { channel: data.channel, status: data.status, teamId: data.teamId ?? null },
      },
      { role: auth.role, tenantId }
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create conversation";
    const status = message.includes("team") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
