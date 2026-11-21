import type { NextRequest } from "next/server";
import { readSession } from "@/src/server/modules/auth/session";
import {
  createFieldVisit,
  ensureFieldOfficer,
  listFieldOperationOptions,
  listFieldVisits,
} from "@/src/server/modules/field-operations/field-operations.service";

export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const includeOptions = request.nextUrl.searchParams.get("options") === "true";
    if (includeOptions) {
      return Response.json({ ...(await listFieldOperationOptions()) });
    }
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 100), 200);
    const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || 0), 0);
    return Response.json({ visits: await listFieldVisits(limit, offset) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load field operations" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.visitType) return Response.json({ error: "Visit type is required" }, { status: 400 });

    let fieldOfficerId = body.fieldOfficerId;
    if (!fieldOfficerId) {
      const officer = await ensureFieldOfficer(session.userId, `FO-${session.userId.slice(0, 8).toUpperCase()}`);
      fieldOfficerId = officer.id;
    }

    const visit = await createFieldVisit({
      fieldOfficerId,
      farmerId: body.farmerId || undefined,
      farmId: body.farmId || undefined,
      visitType: body.visitType,
      purpose: body.purpose,
      visitDate: body.visitDate || new Date().toISOString(),
      latitude: body.latitude != null ? Number(body.latitude) : undefined,
      longitude: body.longitude != null ? Number(body.longitude) : undefined,
      locationAccuracy: body.locationAccuracy != null ? Number(body.locationAccuracy) : undefined,
      location: body.location,
      notes: body.notes,
      status: body.status,
      createdBy: session.userId,
      observations: Array.isArray(body.observations) ? body.observations : [],
      photos: Array.isArray(body.photos) ? body.photos : [],
      documents: Array.isArray(body.documents) ? body.documents : [],
      followups: Array.isArray(body.followups) ? body.followups : [],
    });

    return Response.json({ visit }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create field visit" }, { status: 503 });
  }
}
