import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/server/auth";
import { getPlatformSubAdminPermissions, setPlatformSubAdminPermissions } from "@/lib/server/state";

const schema = z.object({
  permissions: z.array(z.string()),
});

function requirePlatformOwner(email: string) {
  const ownerEmail = (process.env.PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  return email.toLowerCase() === ownerEmail;
}

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!requirePlatformOwner(auth.email)) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const { userId } = await context.params;
  const data = await getPlatformSubAdminPermissions(userId);
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!requirePlatformOwner(auth.email)) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid permission payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { userId } = await context.params;
  const data = await setPlatformSubAdminPermissions(userId, parsed.data.permissions);
  return NextResponse.json({ data });
}
