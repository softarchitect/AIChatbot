import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  findUserById,
  getRefreshSessionById,
  markRefreshReuseDetected,
  recordAuthEvent,
  revokeAllUserRefreshSessions,
  rotateRefreshSession,
} from "@/lib/server/state";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/server/jwt";

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const body = await req.json().catch(() => null);
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid refresh payload." }, { status: 400 });
  }

  try {
    const payload = await verifyRefreshToken(parsed.data.refreshToken);
    if (payload.type !== "refresh") {
      await recordAuthEvent({
        email: "unknown",
        action: "auth.refresh",
        success: false,
        ip,
        details: { reason: "invalid_token_type" },
      });
      return NextResponse.json({ error: "Invalid token type." }, { status: 401 });
    }

    const session = await getRefreshSessionById(payload.sessionId);
    if (!session) {
      await recordAuthEvent({
        email: "unknown",
        action: "auth.refresh",
        success: false,
        ip,
        details: { reason: "missing_session" },
      });
      return NextResponse.json({ error: "Refresh session expired or revoked." }, { status: 401 });
    }
    if (session.revoked) {
      await markRefreshReuseDetected(session.id);
      await revokeAllUserRefreshSessions(session.userId);
      await recordAuthEvent({
        userId: session.userId,
        email: "unknown",
        action: "auth.refresh",
        success: false,
        ip,
        details: { reason: "reuse_detected" },
      });
      return NextResponse.json(
        { error: "Refresh token reuse detected. All sessions revoked." },
        { status: 401 }
      );
    }
    if (session.expiresAt.getTime() < Date.now()) {
      await revokeAllUserRefreshSessions(session.userId);
      await recordAuthEvent({
        userId: session.userId,
        email: "unknown",
        action: "auth.refresh",
        success: false,
        ip,
        details: { reason: "expired" },
      });
      return NextResponse.json({ error: "Refresh session expired or revoked." }, { status: 401 });
    }

    const user = await findUserById(payload.sub);
    if (!user || !user.active) {
      await recordAuthEvent({
        userId: payload.sub,
        email: "unknown",
        action: "auth.refresh",
        success: false,
        ip,
        details: { reason: "inactive_user" },
      });
      return NextResponse.json({ error: "User not found or inactive." }, { status: 401 });
    }

    const rotated = await rotateRefreshSession(
      session.id,
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
      sessionId: rotated.id,
    });

    await recordAuthEvent({
      userId: user.id,
      email: user.email,
      action: "auth.refresh",
      success: true,
      ip,
      details: { rotatedFrom: session.id, rotatedTo: rotated.id },
    });

    return NextResponse.json({ accessToken, refreshToken, expiresIn: 900 });
  } catch {
    await recordAuthEvent({
      email: "unknown",
      action: "auth.refresh",
      success: false,
      ip,
      details: { reason: "invalid_refresh_token" },
    });
    return NextResponse.json({ error: "Invalid refresh token." }, { status: 401 });
  }
}
