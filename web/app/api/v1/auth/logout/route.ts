import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revokeRefreshSession } from "@/lib/server/state";
import { verifyRefreshToken } from "@/lib/server/jwt";

const logoutSchema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = logoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid logout payload." }, { status: 400 });
  }

  try {
    const payload = await verifyRefreshToken(parsed.data.refreshToken);
    if (payload.type !== "refresh") {
      return NextResponse.json({ error: "Invalid token type." }, { status: 401 });
    }
    await revokeRefreshSession(payload.sessionId, null);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
