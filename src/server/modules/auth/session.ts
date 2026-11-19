import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export interface AuthSession {
  userId: string;
  fullName: string;
  username: string;
  role: string;
}

const COOKIE_NAME = "gocofa_admin_session";

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(session: AuthSession) {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function readSession(request: NextRequest): Promise<AuthSession | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
