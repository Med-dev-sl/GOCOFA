import { readSession } from "@/src/server/modules/auth/session";
import { createFarmer, listFarmers } from "@/src/server/modules/farmers/farmer.service";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 50), 100);
  const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || 0), 0);

  try {
    return Response.json({ farmers: await listFarmers(limit, offset) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load farmers" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.firstName || !body.lastName) {
      return Response.json({ error: "First name and last name are required" }, { status: 400 });
    }

    const farmer = await createFarmer({
      firstName: body.firstName,
      middleName: body.middleName,
      lastName: body.lastName,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      phone: body.phone,
      alternativePhone: body.alternativePhone,
      communityId: body.communityId,
      districtId: body.districtId,
      chiefdomId: body.chiefdomId,
      sectionId: body.sectionId,
      cooperativeId: body.cooperativeId,
      registeredBy: session.userId,
      photoUrl: body.photoUrl,
    });

    return Response.json({ farmer }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create farmer" }, { status: 503 });
  }
}
