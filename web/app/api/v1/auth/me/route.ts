import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    id: auth.userId,
    name: auth.name,
    email: auth.email,
    role: auth.role,
    tenantIds: auth.tenantIds,
  });
}
