import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function check() {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

  await sql.unsafe("CREATE TABLE IF NOT EXISTS farmer_debug (id UUID PRIMARY KEY DEFAULT gen_random_uuid())");

  console.log("search_path:", await sql.unsafe("SHOW search_path"));
  console.log("tables:", await sql.unsafe("SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE 'farmer%' ORDER BY tablename"));
  console.log("debug:", await sql.unsafe("SELECT to_regclass('public.farmer_debug') AS value"));
}

check().catch((error) => {
  console.error(error);
  process.exit(1);
});
