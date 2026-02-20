import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySync } from "otplib";
import { createRefreshSession, findUserByEmail, getUserMfa, recordAuthEvent, validatePassword } from "@/lib/server/state";
import { signAccessToken, signRefreshToken } from "@/lib/server/jwt";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  mfaCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const user = await findUserByEmail(parsed.data.email);
  const isValidPassword = user ? await validatePassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !user.active || !isValidPassword) {
    await recordAuthEvent({
      userId: user?.id ?? null,
      email: parsed.data.email,
      action: "auth.login",
      success: false,
      ip,
      details: { reason: "invalid_credentials" },
    });
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const userMfa = await getUserMfa(user.id);
  if (userMfa?.enabled) {
    const code = parsed.data.mfaCode;
    const verified = code ? verifySync({ secret: userMfa.secret, token: code }) : { valid: false };
    if (!code || !verified.valid) {
      await recordAuthEvent({
        userId: user.id,
        email: user.email,
        action: "auth.login",
        success: false,
        ip,
        details: { reason: "mfa_required_or_invalid" },
      });
      return NextResponse.json({ error: "MFA required or invalid code." }, { status: 401 });
    }
  }

  const refreshSession = await createRefreshSession(
    user.id,
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    tenantIds: user.tenantIds,
  });
  const refreshToken = await signRefreshToken({
    sub: user.id,
    sessionId: refreshSession.id,
  });

  await recordAuthEvent({
    userId: user.id,
    email: user.email,
    action: "auth.login",
    success: true,
    ip,
    details: { method: "password", mfa: !!userMfa?.enabled },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantIds: user.tenantIds,
    },
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
}
