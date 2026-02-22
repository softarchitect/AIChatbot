import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/server/auth";
import { changeOwnPassword } from "@/lib/server/state";

const schema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid password payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const changed = await changeOwnPassword(
    auth.userId,
    parsed.data.currentPassword,
    parsed.data.newPassword
  );
  if (!changed) {
    return NextResponse.json({ error: "Current password is invalid." }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
