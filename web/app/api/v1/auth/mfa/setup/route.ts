import { NextRequest, NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import { requireAuth } from "@/lib/server/auth";
import { findUserById, upsertUserMfaSecret } from "@/lib/server/state";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const user = await findUserById(auth.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const appName = process.env.MFA_APP_NAME ?? "SaaSphere";
  const secret = generateSecret();
  await upsertUserMfaSecret(auth.userId, secret);

  const otpauth = generateURI({
    issuer: appName,
    label: user.email,
    secret,
  });
  return NextResponse.json({
    data: {
      secret,
      otpauth,
      message: "Scan this with your authenticator app, then verify.",
    },
  });
}
