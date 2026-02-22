import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/server/auth";
import {
  getPlatformSubAdminPermissions,
  listSubscriptionPlans,
  updateSubscriptionPlan,
} from "@/lib/server/state";

const updateSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2).optional(),
  trialDays: z.number().int().min(1).max(365).optional(),
  agentLimit: z.number().int().min(1).max(100000).optional(),
  enabledFeatureKeys: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

function requirePlatformOwner(email: string) {
  const ownerEmail = (process.env.PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  return email.toLowerCase() === ownerEmail;
}

async function canManageSubscriptionPlans(auth: {
  email: string;
  isPlatformSubAdmin: boolean;
  userId: string;
}) {
  if (requirePlatformOwner(auth.email)) return true;
  if (!auth.isPlatformSubAdmin) return false;
  const permissions = await getPlatformSubAdminPermissions(auth.userId);
  return permissions.includes("manage_subscription_plans");
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!(await canManageSubscriptionPlans(auth))) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const data = await listSubscriptionPlans();
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!(await canManageSubscriptionPlans(auth))) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = await updateSubscriptionPlan(parsed.data.id, {
    name: parsed.data.name,
    trialDays: parsed.data.trialDays,
    agentLimit: parsed.data.agentLimit,
    enabledFeatureKeys: parsed.data.enabledFeatureKeys,
    status: parsed.data.status,
  });
  if (!data) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }
  return NextResponse.json({ data });
}
