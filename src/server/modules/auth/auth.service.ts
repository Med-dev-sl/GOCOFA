import bcrypt from "bcryptjs";
import { getDatabase } from "@/src/server/database/neon";

interface AuthUser {
  id: string;
  full_name: string;
  username: string;
  email: string;
  password_hash: string;
  role_name: string;
}

export async function authenticateUser(username: string, password: string) {
  const sql = getDatabase();
  const users = await sql`
    SELECT u.id, u.full_name, u.username, u.email, u.password_hash, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.username = ${username} AND u.is_active = TRUE
    LIMIT 1
  `;

  const user = (users[0] as AuthUser | undefined);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return null;

  await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;
  return user;
}
