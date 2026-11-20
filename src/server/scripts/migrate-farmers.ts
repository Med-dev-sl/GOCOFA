import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "@neondatabase/serverless";

async function migrate() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    const file = path.join(process.cwd(), "src/server/migrations/002-farmer-registry.sql");
    const migration = await fs.readFile(file, "utf8");

    await client.query("BEGIN");
    for (const statement of migration.split(";").map((item) => item.trim()).filter(Boolean)) {
      await client.query(statement);
    }
    await client.query("COMMIT");

    console.log("Farmer registry migration completed.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
