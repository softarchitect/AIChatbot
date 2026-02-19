import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-only-jwt-secret-change-me");
const issuer = "saasphere-api";
const audience = "saasphere-web";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  tenantIds: string[];
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: "refresh";
}

export async function signAccessToken(payload: Omit<AccessTokenPayload, "type">) {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">) {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const result = await jwtVerify(token, secret, { issuer, audience });
  return result.payload as unknown as AccessTokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const result = await jwtVerify(token, secret, { issuer, audience });
  return result.payload as unknown as RefreshTokenPayload;
}
