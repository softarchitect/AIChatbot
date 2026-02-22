import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createEmailVerificationToken, verifyEmailByToken } from "@/lib/server/state";

const resendSchema = z.object({
  email: z.string().email(),
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing verification token." }, { status: 400 });
  }
  const success = await verifyEmailByToken(token);
  if (!success) {
    return NextResponse.json({ error: "Invalid or expired verification token." }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid resend payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const token = await createEmailVerificationToken(parsed.data.email.toLowerCase());
    const origin = new URL(req.url).origin;
    return NextResponse.json({ success: true, verifyUrl: `${origin}/auth/verify-email?token=${token}` });
  } catch {
    return NextResponse.json({ error: "Unable to issue verification token." }, { status: 400 });
  }
}
