import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserById, recordAuthEvent, revokeRefreshSession } from "@/lib/server/state";
import { verifyRefreshToken } from "@/lib/server/jwt";

const logoutSchema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const body = await req.json().catch(() => null);
  const parsed = logoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid logout payload." }, { status: 400 });
  }

  try {
    const payload = await verifyRefreshToken(parsed.data.refreshToken);
    if (payload.type !== "refresh") {
      await recordAuthEvent({
        email: "unknown",
        action: "auth.logout",
        success: false,
        ip,
        details: { reason: "invalid_token_type" },
      });
      return NextResponse.json({ error: "Invalid token type." }, { status: 401 });
    }
    await revokeRefreshSession(payload.sessionId, null);
    const user = await findUserById(payload.sub);
    await recordAuthEvent({
      userId: payload.sub,
      email: user?.email ?? "unknown",
      action: "auth.logout",
      success: true,
      ip,
      details: { sessionId: payload.sessionId },
    });
    return NextResponse.json({ success: true });
  } catch {
    await recordAuthEvent({
      email: "unknown",
      action: "auth.logout",
      success: false,
      ip,
      details: { reason: "invalid_refresh_token" },
    });
    return NextResponse.json({ success: true });
  }
}
