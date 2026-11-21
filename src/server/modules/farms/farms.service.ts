import { getDatabase } from "@/src/server/database/neon";

export interface CreateFarmInput {
  farmerId: string;
  farmName?: string;
  declaredArea?: number;
  allocatedCocoaArea?: number;
  ownershipType?: string;
  farmAge?: number;
  cropType?: string;
  variety?: string;
  productionEstimate?: number;
  createdBy?: string;
  points?: Array<{ latitude: number; longitude: number; accuracy?: number }>;
}

function generateFarmCode() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `FARM-${year}-${random}`;
}

function calculatePolygonArea(points: Array<{ latitude: number; longitude: number }>) {
  if (points.length < 3) return 0;

  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  let area = 0;

  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const lat1 = toRad(current.latitude);
    const lat2 = toRad(next.latitude);
    const lonDiff = toRad(next.longitude - current.longitude);
    area += lonDiff * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area * earthRadius * earthRadius / 2);
  return area / 10000;
}

export async function listFarms(limit = 50, offset = 0) {
  const sql = getDatabase();
  return sql`
    SELECT f.id, f.farm_code, f.farm_name, f.declared_area, f.calculated_area,
           f.allocated_cocoa_area, f.ownership_type, f.farm_age, f.crop_type,
           f.variety, f.production_estimate, f.status, f.created_at,
           fr.id AS farmer_id, fr.farmer_code, fr.first_name, fr.last_name,
           fr.photo_url
    FROM farms f
    JOIN farmers fr ON fr.id = f.farmer_id
    ORDER BY f.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export async function createFarm(input: CreateFarmInput) {
  const sql = getDatabase();
  const farmCode = generateFarmCode();
  const calculatedArea = input.points && input.points.length >= 3
    ? calculatePolygonArea(input.points)
    : null;

  const farms = await sql`
    INSERT INTO farms (
      farm_code, farmer_id, farm_name, declared_area, calculated_area,
      allocated_cocoa_area, ownership_type, farm_age, crop_type, variety,
      production_estimate, status, created_by
    ) VALUES (
      ${farmCode}, ${input.farmerId}, ${input.farmName || null}, ${input.declaredArea || null},
      ${calculatedArea}, ${input.allocatedCocoaArea || null}, ${input.ownershipType || null},
      ${input.farmAge || null}, ${input.cropType || "cocoa"}, ${input.variety || null},
      ${input.productionEstimate || null}, 'draft', ${input.createdBy || null}
    )
    RETURNING *
  `;

  const farm = farms[0];

  for (const point of input.points || []) {
    await sql`
      INSERT INTO farm_locations (
        farm_id, location_type, latitude, longitude, accuracy_meters,
        captured_by
      ) VALUES (
        ${farm.id}, 'point', ${point.latitude}, ${point.longitude},
        ${point.accuracy || null}, ${input.createdBy || null}
      )
    `;
  }

  if (input.points && input.points.length >= 3) {
    const geojson = {
      type: "Polygon",
      coordinates: [[
        ...input.points.map((point) => [point.longitude, point.latitude]),
        [input.points[0].longitude, input.points[0].latitude],
      ]],
    };

    await sql`
      INSERT INTO farm_boundaries (
        farm_id, geojson, area_hectares, capture_method, captured_by
      ) VALUES (
        ${farm.id}, ${JSON.stringify(geojson)}::jsonb, ${calculatedArea}, 'gps_walk', ${input.createdBy || null}
      )
    `;
  }

  return farm;
}
