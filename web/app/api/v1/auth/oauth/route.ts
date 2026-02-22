import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createRefreshSession, findUserByEmail, recordAuthEvent } from "@/lib/server/state";
import { signAccessToken, signRefreshToken } from "@/lib/server/jwt";

const schema = z.object({
  provider: z.enum(["google", "microsoft"]),
  idToken: z.string().min(20),
});

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const microsoftJwks = createRemoteJWKSet(
  new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys")
);

async function verifyProviderToken(provider: "google" | "microsoft", idToken: string) {
  if (provider === "google") {
    const expectedAud = process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const { payload } = await jwtVerify(idToken, googleJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: expectedAud ? [expectedAud] : undefined,
    });
    return payload;
  }

  const expectedAud =
    process.env.MICROSOFT_CLIENT_ID ?? process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
  const { payload } = await jwtVerify(idToken, microsoftJwks, {
    audience: expectedAud ? [expectedAud] : undefined,
  });
  const iss = String(payload.iss ?? "");
  if (!iss.startsWith("https://login.microsoftonline.com/") || !iss.endsWith("/v2.0")) {
    throw new Error("Invalid Microsoft token issuer");
  }
  return payload;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid OAuth payload." }, { status: 400 });
  }

  try {
    const { provider, idToken } = parsed.data;
    const payload = await verifyProviderToken(provider, idToken);
    const email = String(payload.email ?? "").toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "OAuth token missing email." }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.active) {
      await recordAuthEvent({
        email,
        action: "auth.oauth_login",
        success: false,
        ip,
        details: { provider, reason: "user_not_found_or_inactive" },
      });
      return NextResponse.json({ error: "User is not onboarded for this tenant." }, { status: 401 });
    }
    if (user.emailVerified === false) {
      await recordAuthEvent({
        userId: user.id,
        email: user.email,
        action: "auth.oauth_login",
        success: false,
        ip,
        details: { provider, reason: "email_not_verified" },
      });
      return NextResponse.json(
        { error: "Email is not verified. Please verify your email before login." },
        { status: 403 }
      );
    }

    const refreshSession = await createRefreshSession(user.id, Date.now() + 7 * 24 * 60 * 60 * 1000);
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
      action: "auth.oauth_login",
      success: true,
      ip,
      details: { provider },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPlatformSubAdmin: Boolean(user.isPlatformSubAdmin),
        tenantIds: user.tenantIds,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch {
    return NextResponse.json({ error: "Failed to verify OAuth token." }, { status: 401 });
  }
}
