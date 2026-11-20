import { readSession } from "@/src/server/modules/auth/session";
import { getFarmer } from "@/src/server/modules/farmers/farmer.service";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const farmer = await getFarmer(id);
    if (!farmer) return Response.json({ error: "Farmer not found" }, { status: 404 });
    return Response.json({ farmer });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load farmer" }, { status: 503 });
  }
}
