import { readSession } from "@/src/server/modules/auth/session";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: true, session });
}
