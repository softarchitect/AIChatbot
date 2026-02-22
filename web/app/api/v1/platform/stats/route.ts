import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { getPlatformSubAdminPermissions, listPlatformStats } from "@/lib/server/state";

function requirePlatformOwner(email: string) {
  const ownerEmail = (process.env.PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  return email.toLowerCase() === ownerEmail;
}

async function canAccessPlatformStats(auth: { email: string; isPlatformSubAdmin: boolean; userId: string }) {
  if (requirePlatformOwner(auth.email)) return true;
  if (!auth.isPlatformSubAdmin) return false;
  const permissions = await getPlatformSubAdminPermissions(auth.userId);
  return permissions.includes("view_platform_stats");
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!(await canAccessPlatformStats(auth))) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const data = await listPlatformStats();
  return NextResponse.json({ data });
}
