import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { getDatabase } from "../database/neon";

async function seedAdmin() {
  const fullName = process.env.ADMIN_FULL_NAME;
  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!fullName || !username || !email || !password) {
    throw new Error("Set ADMIN_FULL_NAME, ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD.");
  }

  const sql = getDatabase();
  await sql`INSERT INTO roles (name, description)
    VALUES ('admin', 'Full system administration access')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`;

  const passwordHash = await bcrypt.hash(password, 12);
  await sql`INSERT INTO users (full_name, username, email, password_hash, role_id)
    SELECT ${fullName}, ${username}, ${email}, ${passwordHash}, r.id
    FROM roles r WHERE r.name = 'admin'
    ON CONFLICT (username) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      password_hash = EXCLUDED.password_hash,
      role_id = EXCLUDED.role_id,
      is_active = TRUE,
      updated_at = NOW()`;

  console.log(`Admin account ${username} is ready.`);
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
