import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "../database/neon";

async function migrate() {
  const sql = getDatabase();
  const file = path.join(process.cwd(), "src/server/migrations/001-auth.sql");
  const migration = await fs.readFile(file, "utf8");
  const statements = migration
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  await sql.unsafe("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await sql.unsafe("CREATE INDEX IF NOT EXISTS users_role_id_idx ON users(role_id)");
  await sql.unsafe("CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)");

  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  console.log("Database migration completed.");
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
