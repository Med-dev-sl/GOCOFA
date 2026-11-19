import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function check() {
  const sql = neon(process.env.DATABASE_URL!);
  console.log(await sql`
    SELECT current_database() AS database,
           current_user AS username,
           current_schema() AS schema,
           to_regclass('public.roles') AS roles,
           to_regclass('public.users') AS users,
           current_setting('transaction_read_only') AS read_only
  `);
}

check().catch((error) => {
  console.error(error);
  process.exit(1);
});
