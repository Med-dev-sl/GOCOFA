import { readSession } from "@/src/server/modules/auth/session";
import { getDatabase } from "@/src/server/database/neon";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sql = getDatabase();
    const farmers = await sql`
      SELECT id, farmer_code, first_name, middle_name, last_name, status
      FROM farmers
      WHERE status IN ('active', 'verified', 'draft', 'pending')
      ORDER BY first_name, last_name
    `;
    return Response.json({ farmers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load farmers" }, { status: 503 });
  }
}
