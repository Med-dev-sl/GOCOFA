import { getDatabase } from "@/src/server/database/neon";

export interface CreateFarmerInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  alternativePhone?: string;
  communityId?: string;
  districtId?: string;
  chiefdomId?: string;
  sectionId?: string;
  cooperativeId?: string;
  registeredBy?: string;
  photoUrl?: string;
}

function generateFarmerCode() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `GOCOFA-${year}-${random}`;
}

export async function listFarmers(limit = 50, offset = 0) {
  const sql = getDatabase();
  return sql`
    SELECT f.id, f.farmer_code, f.first_name, f.middle_name, f.last_name,
           f.gender, f.date_of_birth, f.status, f.photo_url, f.created_at,
           d.name AS district_name, c.name AS chiefdom_name,
           s.name AS section_name, co.name AS cooperative_name,
           (SELECT contact_value FROM farmer_contacts fc
            WHERE fc.farmer_id = f.id AND fc.is_primary = TRUE LIMIT 1) AS primary_phone
    FROM farmers f
    LEFT JOIN districts d ON d.id = f.district_id
    LEFT JOIN chiefdoms c ON c.id = f.chiefdom_id
    LEFT JOIN sections s ON s.id = f.section_id
    LEFT JOIN cooperatives co ON co.id = f.cooperative_id
    ORDER BY f.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export async function getFarmer(farmerId: string) {
  const sql = getDatabase();
  const farmers = await sql`
    SELECT f.*, d.name AS district_name, c.name AS chiefdom_name,
           s.name AS section_name, cm.name AS community_name,
           co.name AS cooperative_name
    FROM farmers f
    LEFT JOIN districts d ON d.id = f.district_id
    LEFT JOIN chiefdoms c ON c.id = f.chiefdom_id
    LEFT JOIN sections s ON s.id = f.section_id
    LEFT JOIN communities cm ON cm.id = f.community_id
    LEFT JOIN cooperatives co ON co.id = f.cooperative_id
    WHERE f.id = ${farmerId}
    LIMIT 1
  `;

  const farmer = farmers[0];
  if (!farmer) return null;

  const [identifications, documents, contacts, memberships, statusHistory, locations] = await Promise.all([
    sql`SELECT * FROM farmer_identifications WHERE farmer_id = ${farmerId} ORDER BY is_primary DESC, created_at DESC`,
    sql`SELECT * FROM farmer_documents WHERE farmer_id = ${farmerId} ORDER BY created_at DESC`,
    sql`SELECT * FROM farmer_contacts WHERE farmer_id = ${farmerId} ORDER BY is_primary DESC, created_at DESC`,
    sql`SELECT fm.*, co.name AS cooperative_name FROM farmer_cooperative_memberships fm LEFT JOIN cooperatives co ON co.id = fm.cooperative_id WHERE fm.farmer_id = ${farmerId} ORDER BY fm.is_primary DESC, fm.created_at DESC`,
    sql`SELECT * FROM farmer_status_history WHERE farmer_id = ${farmerId} ORDER BY created_at DESC`,
    sql`SELECT * FROM farmer_locations WHERE farmer_id = ${farmerId} ORDER BY captured_at DESC LIMIT 100`,
  ]);

  return { ...farmer, identifications, documents, contacts, memberships, statusHistory, locations };
}

export async function createFarmer(input: CreateFarmerInput) {
  const sql = getDatabase();
  const farmerCode = generateFarmerCode();

  const farmers = await sql`
    INSERT INTO farmers (
      farmer_code, first_name, middle_name, last_name, gender, date_of_birth,
      community_id, district_id, chiefdom_id, section_id, cooperative_id,
      status, photo_url, registered_by
    ) VALUES (
      ${farmerCode}, ${input.firstName}, ${input.middleName || null}, ${input.lastName},
      ${input.gender || null}, ${input.dateOfBirth || null}, ${input.communityId || null},
      ${input.districtId || null}, ${input.chiefdomId || null}, ${input.sectionId || null},
      ${input.cooperativeId || null}, 'draft', ${input.photoUrl || null}, ${input.registeredBy || null}
    )
    RETURNING *
  `;

  const farmer = farmers[0];

  if (input.phone) {
    await sql`INSERT INTO farmer_contacts (farmer_id, contact_type, contact_value, is_primary)
      VALUES (${farmer.id}, 'phone', ${input.phone}, TRUE)`;
  }

  if (input.alternativePhone) {
    await sql`INSERT INTO farmer_contacts (farmer_id, contact_type, contact_value, is_primary)
      VALUES (${farmer.id}, 'phone', ${input.alternativePhone}, FALSE)`;
  }

  await sql`INSERT INTO farmer_status_history (farmer_id, from_status, to_status, reason)
    VALUES (${farmer.id}, NULL, 'draft', 'Farmer record created')`;

  return farmer;
}
