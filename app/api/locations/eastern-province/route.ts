import { readSession } from "@/src/server/modules/auth/session";
import { getDatabase } from "@/src/server/database/neon";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sql = getDatabase();
    const districts = await sql`
      SELECT d.id, d.name, d.code,
             COALESCE(json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.name)
               FILTER (WHERE c.id IS NOT NULL), '[]'::json) AS chiefdoms
      FROM districts d
      LEFT JOIN chiefdoms c ON c.district_id = d.id
      WHERE d.name IN ('Kailahun District', 'Kenema District', 'Kono District')
      GROUP BY d.id, d.name, d.code
      ORDER BY d.name
    `;

    return Response.json({ districts });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Location hierarchy unavailable" },
      { status: 503 },
    );
  }
}
