import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "../database/neon";

async function migrate() {
  const sql = getDatabase();
  const file = path.join(process.cwd(), "src/server/migrations/002-farmer-registry.sql");
  const migration = await fs.readFile(file, "utf8");

  for (const statement of migration.split(";").map((item) => item.trim()).filter(Boolean)) {
    await sql.unsafe(statement);
  }

  console.log("Farmer registry migration completed.");
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
