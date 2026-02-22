import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { selfRegisterTenant } from "@/lib/server/state";

const schema = z.object({
  companyName: z.string().min(2),
  domain: z.string().min(3),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  password: z.string().min(8),
  language: z.string().default("en"),
  timezone: z.string().default("UTC"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await selfRegisterTenant(parsed.data);
    return NextResponse.json(
      {
        data: {
          tenantId: result.tenant.id,
          tenantName: result.tenant.name,
          plan: "free",
          trial: result.trial,
          adminEmail: parsed.data.adminEmail.toLowerCase(),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "Tenant domain or admin email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to register tenant." }, { status: 500 });
  }
}
