import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/lib/mock/data";
import { hasPermission } from "@/lib/server/rbac";
import { findUserById, getTenantRolePermissions } from "@/lib/server/state";
import { verifyAccessToken } from "@/lib/server/jwt";

export interface AuthContext {
  userId: string;
  role: Role;
  tenantIds: string[];
  name: string;
  email: string;
}

export async function requireAuth(req: NextRequest): Promise<AuthContext | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = await verifyAccessToken(token);
    if (payload.type !== "access") {
      return NextResponse.json({ error: "Invalid access token type." }, { status: 401 });
    }

    const user = await findUserById(payload.sub);
    if (!user || !user.active) {
      return NextResponse.json({ error: "User not found or inactive." }, { status: 401 });
    }

    return {
      userId: user.id,
      role: user.role,
      tenantIds: user.tenantIds,
      name: user.name,
      email: user.email,
    };
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }
}

export async function requirePermission(
  auth: AuthContext,
  permission: string,
  tenantId?: string
): Promise<NextResponse | null> {
  if (tenantId) {
    const matrix = await getTenantRolePermissions(tenantId, { role: auth.role, tenantId });
    const rolePermissions = matrix[auth.role] ?? [];
    if (!rolePermissions.includes(permission)) {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
    }
    return null;
  }

  if (!hasPermission(auth.role, permission)) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }
  return null;
}

export function requireTenantAccess(
  req: NextRequest,
  auth: AuthContext,
  tenantId: string
): NextResponse | null {
  const headerTenantId = req.headers.get("x-tenant-id");
  if (headerTenantId && headerTenantId !== tenantId) {
    return NextResponse.json({ error: "Tenant mismatch between path and header." }, { status: 400 });
  }

  if (auth.role === "admin") {
    return null;
  }

  if (!auth.tenantIds.includes(tenantId)) {
    return NextResponse.json({ error: "Cross-tenant access denied." }, { status: 403 });
  }

  return null;
}
