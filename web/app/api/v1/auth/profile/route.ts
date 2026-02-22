import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/server/auth";
import { updateOwnProfile } from "@/lib/server/state";

const schema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = await updateOwnProfile(auth.userId, parsed.data);
  if (!data) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({
    data: {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      tenantIds: data.tenantIds,
    },
  });
}
