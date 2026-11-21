import type { NextRequest } from "next/server";
import { readSession } from "@/src/server/modules/auth/session";
import { getDatabase } from "@/src/server/database/neon";

export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sql = getDatabase();
    const cooperatives = await sql`
      SELECT c.id, c.name, c.code, c.district_id, c.is_active,
             d.name AS district_name
      FROM cooperatives c
      LEFT JOIN districts d ON d.id = c.district_id
      ORDER BY c.name
    `;
    return Response.json({ cooperatives });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load cooperatives" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return Response.json({ error: "Cooperative name is required" }, { status: 400 });

    const sql = getDatabase();
    const existing = await sql`
      SELECT id, name, code, district_id, is_active
      FROM cooperatives
      WHERE LOWER(name) = LOWER(${name})
      LIMIT 1
    `;
    if (existing[0]) return Response.json({ cooperative: existing[0], existing: true });

    const code = `COOP-${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 24).toUpperCase()}-${Date.now().toString().slice(-5)}`;
    const created = await sql`
      INSERT INTO cooperatives (name, code, district_id, is_active)
      VALUES (${name}, ${code}, ${body.districtId || null}, TRUE)
      RETURNING id, name, code, district_id, is_active
    `;
    return Response.json({ cooperative: created[0], existing: false }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create cooperative" }, { status: 503 });
  }
}
