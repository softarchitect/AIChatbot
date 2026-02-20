import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { setUserMfaEnabled } from "@/lib/server/state";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  await setUserMfaEnabled(auth.userId, false);
  return NextResponse.json({ success: true });
}
