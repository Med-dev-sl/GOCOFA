import { readSession } from "@/src/server/modules/auth/session";
import { createFarm, listFarms } from "@/src/server/modules/farms/farms.service";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 50), 100);
  const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || 0), 0);

  try {
    return Response.json({ farms: await listFarms(limit, offset) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load farms" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.farmerId) return Response.json({ error: "Farmer is required" }, { status: 400 });

    const farm = await createFarm({
      farmerId: body.farmerId,
      farmName: body.farmName,
      declaredArea: body.declaredArea ? Number(body.declaredArea) : undefined,
      allocatedCocoaArea: body.allocatedCocoaArea ? Number(body.allocatedCocoaArea) : undefined,
      ownershipType: body.ownershipType,
      farmAge: body.farmAge ? Number(body.farmAge) : undefined,
      cropType: body.cropType,
      variety: body.variety,
      productionEstimate: body.productionEstimate ? Number(body.productionEstimate) : undefined,
      createdBy: session.userId,
      declaredPoints: Array.isArray(body.declaredPoints) ? body.declaredPoints : [],
      allocatedPoints: Array.isArray(body.allocatedPoints) ? body.allocatedPoints : [],
      gpsPoint: body.gpsPoint || undefined,
      photos: Array.isArray(body.photos) ? body.photos : [],
    });

    return Response.json({ farm }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create farm" }, { status: 503 });
  }
}
