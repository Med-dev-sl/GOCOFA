import { getDatabase } from "@/src/server/database/neon";

export async function getDatabaseHealth() {
  const sql = getDatabase();
  const result = await sql`SELECT 1 AS healthy`;

  return {
    status: "ok",
    database: result[0]?.healthy === 1 ? "connected" : "unknown",
  };
}
