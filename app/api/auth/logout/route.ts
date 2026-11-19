import { COOKIE_NAME } from "@/src/server/modules/auth/session";

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}
