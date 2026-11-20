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

  console.log(await sql`
    SELECT
      to_regclass('public.farmers') AS farmers,
      to_regclass('public.farmer_identifications') AS identifications,
      to_regclass('public.farmer_documents') AS documents,
      to_regclass('public.farmer_contacts') AS contacts,
      to_regclass('public.farmer_cooperative_memberships') AS memberships,
      to_regclass('public.farmer_status_history') AS status_history,
      to_regclass('public.farmer_locations') AS locations
  `);
}

check().catch((error) => {
  console.error(error);
  process.exit(1);
});
