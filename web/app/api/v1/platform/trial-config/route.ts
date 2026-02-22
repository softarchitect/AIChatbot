import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/server/auth";
import {
  getPlatformSubAdminPermissions,
  getPlatformTrialConfig,
  updatePlatformTrialConfig,
} from "@/lib/server/state";

const updateSchema = z.object({
  maxAgents: z.number().int().min(1).max(1000).optional(),
  enabledFeatureKeys: z.array(z.string()).min(1).optional(),
  trialDays: z.number().int().min(1).max(365).optional(),
});

function requirePlatformOwner(email: string) {
  const ownerEmail = (process.env.PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  return email.toLowerCase() === ownerEmail;
}

async function canManageTrialConfig(auth: { email: string; isPlatformSubAdmin: boolean; userId: string }) {
  if (requirePlatformOwner(auth.email)) return true;
  if (!auth.isPlatformSubAdmin) return false;
  const permissions = await getPlatformSubAdminPermissions(auth.userId);
  return permissions.includes("manage_trial_config");
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!(await canManageTrialConfig(auth))) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const data = await getPlatformTrialConfig();
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!(await canManageTrialConfig(auth))) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid trial config payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = await updatePlatformTrialConfig(parsed.data);
  return NextResponse.json({ data });
}
