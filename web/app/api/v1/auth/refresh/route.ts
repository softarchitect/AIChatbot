import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  findUserById,
  getRefreshSessionById,
  markRefreshReuseDetected,
  revokeAllUserRefreshSessions,
  rotateRefreshSession,
} from "@/lib/server/state";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/server/jwt";

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid refresh payload." }, { status: 400 });
  }

  try {
    const payload = await verifyRefreshToken(parsed.data.refreshToken);
    if (payload.type !== "refresh") {
      return NextResponse.json({ error: "Invalid token type." }, { status: 401 });
    }

    const session = await getRefreshSessionById(payload.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Refresh session expired or revoked." }, { status: 401 });
    }
    if (session.revoked) {
      await markRefreshReuseDetected(session.id);
      await revokeAllUserRefreshSessions(session.userId);
      return NextResponse.json(
        { error: "Refresh token reuse detected. All sessions revoked." },
        { status: 401 }
      );
    }
    if (session.expiresAt.getTime() < Date.now()) {
      await revokeAllUserRefreshSessions(session.userId);
      return NextResponse.json({ error: "Refresh session expired or revoked." }, { status: 401 });
    }

    const user = await findUserById(payload.sub);
    if (!user || !user.active) {
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

    return NextResponse.json({ accessToken, refreshToken, expiresIn: 900 });
  } catch {
    return NextResponse.json({ error: "Invalid refresh token." }, { status: 401 });
  }
}
