import { authenticateUser } from "@/src/server/modules/auth/auth.service";
import { COOKIE_NAME, createSessionToken } from "@/src/server/modules/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return Response.json({ error: "Username and password are required" }, { status: 400 });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return Response.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      fullName: user.full_name,
      username: user.username,
      role: user.role_name,
    });

    const response = Response.json({
      user: {
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role_name,
      },
    });

    response.headers.set("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
    return response;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Login unavailable" }, { status: 503 });
  }
}
