import { readSession } from "@/src/server/modules/auth/session";
import { getOverviewData } from "@/src/server/modules/overview/overview.service";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return Response.json(await getOverviewData());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Overview unavailable" },
      { status: 503 },
    );
  }
}
