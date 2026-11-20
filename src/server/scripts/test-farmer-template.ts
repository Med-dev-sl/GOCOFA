import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function test() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`CREATE TABLE IF NOT EXISTS farmer_template_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
  )`;
  console.log(await sql`SELECT to_regclass('public.farmer_template_test') AS table_name`);
}

test().catch((error) => {
  console.error(error);
  process.exit(1);
});
