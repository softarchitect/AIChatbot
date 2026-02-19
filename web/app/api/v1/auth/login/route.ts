import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRefreshSession, findUserByEmail, validatePassword } from "@/lib/server/state";
import { signAccessToken, signRefreshToken } from "@/lib/server/jwt";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const user = await findUserByEmail(parsed.data.email);
  const isValidPassword = user ? await validatePassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !user.active || !isValidPassword) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const refreshSession = await createRefreshSession(
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
    sessionId: refreshSession.id,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantIds: user.tenantIds,
    },
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
}
