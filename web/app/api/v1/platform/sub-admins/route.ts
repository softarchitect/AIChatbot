import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/server/auth";
import {
  createPlatformSubAdmin,
  getPlatformSubAdminPermissions,
  listPlatformSubAdmins,
  updatePlatformSubAdmin,
} from "@/lib/server/state";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const updateSchema = z.object({
  userId: z.string().min(2),
  name: z.string().min(2).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

function requirePlatformOwner(email: string) {
  const ownerEmail = (process.env.PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  return email.toLowerCase() === ownerEmail;
}

async function canManageSubAdmins(auth: { email: string; isPlatformSubAdmin: boolean; userId: string }) {
  if (requirePlatformOwner(auth.email)) return true;
  if (!auth.isPlatformSubAdmin) return false;
  const permissions = await getPlatformSubAdminPermissions(auth.userId);
  return permissions.includes("manage_sub_admins");
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!(await canManageSubAdmins(auth))) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const data = await listPlatformSubAdmins();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!(await canManageSubAdmins(auth))) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sub-admin payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const data = await createPlatformSubAdmin(parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create sub-admin." },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!(await canManageSubAdmins(auth))) {
    return NextResponse.json({ error: "Only platform owner can access this resource." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sub-admin update payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = await updatePlatformSubAdmin(parsed.data.userId, {
    name: parsed.data.name,
    active: parsed.data.active,
    password: parsed.data.password,
  });
  if (!data) {
    return NextResponse.json({ error: "Sub-admin not found." }, { status: 404 });
  }
  return NextResponse.json({ data });
}
