import { getDatabase } from "@/src/server/database/neon";

export interface CreateFieldVisitInput {
  fieldOfficerId: string;
  farmerId?: string;
  farmId?: string;
  visitType: string;
  purpose?: string;
  visitDate: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  location?: string;
  notes?: string;
  status?: string;
  createdBy?: string;
  observations?: Array<{ observationType?: string; observation: string; recommendation?: string; severity?: string }>;
  photos?: Array<{ photoUrl: string; publicId?: string; caption?: string; category?: string; fileName?: string; mimeType?: string; fileSize?: number }>;
  documents?: Array<{ documentUrl: string; publicId?: string; title?: string; documentType?: string; fileName?: string; mimeType?: string; fileSize?: number }>;
  followups?: Array<{ actionRequired: string; assignedTo?: string; dueDate?: string }>;
}

export async function listFieldVisits(limit = 100, offset = 0) {
  const sql = getDatabase();
  return sql`
    SELECT fv.*, fo.employee_code,
      u.full_name AS officer_name, u.username AS officer_username,
      fr.farmer_code, fr.first_name AS farmer_first_name, fr.last_name AS farmer_last_name,
      fm.farm_code, fm.farm_name,
      (SELECT COUNT(*)::int FROM field_visit_photos vp WHERE vp.field_visit_id = fv.id) AS photo_count,
      (SELECT COUNT(*)::int FROM field_visit_documents vd WHERE vd.field_visit_id = fv.id) AS document_count,
      (SELECT COUNT(*)::int FROM field_visit_followups vf WHERE vf.field_visit_id = fv.id AND vf.status = 'pending') AS pending_followups
    FROM field_visits fv
    JOIN field_officers fo ON fo.id = fv.field_officer_id
    JOIN users u ON u.id = fo.user_id
    LEFT JOIN farmers fr ON fr.id = fv.farmer_id
    LEFT JOIN farms fm ON fm.id = fv.farm_id
    ORDER BY fv.visit_date DESC, fv.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export async function listFieldOperationOptions() {
  const sql = getDatabase();
  const [officers, farmers, farms, users] = await Promise.all([
    sql`SELECT fo.id, fo.employee_code, fo.status, fo.user_id,
      u.full_name, u.username
      FROM field_officers fo JOIN users u ON u.id = fo.user_id
      WHERE fo.status = 'active' ORDER BY u.full_name`,
    sql`SELECT id, farmer_code, first_name, middle_name, last_name
      FROM farmers WHERE status IN ('draft','pending','verified','active')
      ORDER BY first_name, last_name LIMIT 500`,
    sql`SELECT fm.id, fm.farm_code, fm.farm_name, fm.farmer_id,
      fr.first_name, fr.last_name, fr.farmer_code
      FROM farms fm JOIN farmers fr ON fr.id = fm.farmer_id
      ORDER BY fm.created_at DESC LIMIT 500`,
    sql`SELECT id, full_name, username FROM users WHERE is_active = TRUE ORDER BY full_name`,
  ]);
  return { officers, farmers, farms, users };
}

export async function ensureFieldOfficer(userId: string, employeeCode: string) {
  const sql = getDatabase();
  const existing = await sql`SELECT * FROM field_officers WHERE user_id = ${userId} LIMIT 1`;
  if (existing[0]) return existing[0];
  const created = await sql`INSERT INTO field_officers (user_id, employee_code, status)
    VALUES (${userId}, ${employeeCode}, 'active') RETURNING *`;
  return created[0];
}

export async function createFieldVisit(input: CreateFieldVisitInput) {
  const sql = getDatabase();
  const visits = await sql`INSERT INTO field_visits (
    field_officer_id, farmer_id, farm_id, visit_type, purpose, visit_date,
    latitude, longitude, location_accuracy_meters, location, notes, status, created_by
  ) VALUES (
    ${input.fieldOfficerId}, ${input.farmerId || null}, ${input.farmId || null},
    ${input.visitType}, ${input.purpose || null}, ${input.visitDate},
    ${input.latitude ?? null}, ${input.longitude ?? null}, ${input.locationAccuracy ?? null},
    ${input.location || null}, ${input.notes || null}, ${input.status || "completed"}, ${input.createdBy || null}
  ) RETURNING *`;

  const visit = visits[0];
  for (const observation of input.observations || []) {
    await sql`INSERT INTO field_visit_observations (
      field_visit_id, observation_type, observation, recommendation, severity
    ) VALUES (
      ${visit.id}, ${observation.observationType || "general"}, ${observation.observation},
      ${observation.recommendation || null}, ${observation.severity || "normal"}
    )`;
  }
  for (const photo of input.photos || []) {
    await sql`INSERT INTO field_visit_photos (
      field_visit_id, photo_url, public_id, caption, photo_category,
      file_name, mime_type, file_size, uploaded_by
    ) VALUES (
      ${visit.id}, ${photo.photoUrl}, ${photo.publicId || null}, ${photo.caption || null},
      ${photo.category || "field_visit"}, ${photo.fileName || null}, ${photo.mimeType || null},
      ${photo.fileSize || null}, ${input.createdBy || null}
    )`;
  }
  for (const document of input.documents || []) {
    await sql`INSERT INTO field_visit_documents (
      field_visit_id, document_url, public_id, title, document_type,
      file_name, mime_type, file_size, uploaded_by
    ) VALUES (
      ${visit.id}, ${document.documentUrl}, ${document.publicId || null}, ${document.title || null},
      ${document.documentType || "supporting_document"}, ${document.fileName || null},
      ${document.mimeType || null}, ${document.fileSize || null}, ${input.createdBy || null}
    )`;
  }
  for (const followup of input.followups || []) {
    await sql`INSERT INTO field_visit_followups (
      field_visit_id, action_required, assigned_to, due_date, status
    ) VALUES (
      ${visit.id}, ${followup.actionRequired}, ${followup.assignedTo || null},
      ${followup.dueDate || null}, 'pending'
    )`;
  }
  return visit;
}
