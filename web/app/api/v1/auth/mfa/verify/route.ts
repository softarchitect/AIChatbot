import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySync } from "otplib";
import { requireAuth } from "@/lib/server/auth";
import { getUserMfa, setUserMfaEnabled } from "@/lib/server/state";

const schema = z.object({
  code: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid MFA verification payload." }, { status: 400 });
  }

  const mfa = await getUserMfa(auth.userId);
  if (!mfa) {
    return NextResponse.json({ error: "MFA setup is required first." }, { status: 400 });
  }

  const verifyResult = verifySync({ secret: mfa.secret, token: parsed.data.code });
  if (!verifyResult.valid) {
    return NextResponse.json({ error: "Invalid MFA code." }, { status: 401 });
  }

  await setUserMfaEnabled(auth.userId, true);
  return NextResponse.json({ success: true });
}
