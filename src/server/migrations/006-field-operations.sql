CREATE TABLE IF NOT EXISTS field_officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL UNIQUE,
  supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_officer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_officer_id UUID NOT NULL REFERENCES field_officers(id) ON DELETE CASCADE,
  district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
  chiefdom_id UUID REFERENCES chiefdoms(id) ON DELETE SET NULL,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  cooperative_id UUID REFERENCES cooperatives(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_officer_id UUID NOT NULL REFERENCES field_officers(id) ON DELETE RESTRICT,
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  visit_type TEXT NOT NULL,
  purpose TEXT,
  visit_date TIMESTAMPTZ NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location_accuracy_meters NUMERIC(10,2),
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_visit_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_visit_id UUID NOT NULL REFERENCES field_visits(id) ON DELETE CASCADE,
  observation_type TEXT NOT NULL DEFAULT 'general',
  observation TEXT NOT NULL,
  recommendation TEXT,
  severity TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_visit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_visit_id UUID NOT NULL REFERENCES field_visits(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  public_id TEXT,
  caption TEXT,
  photo_category TEXT NOT NULL DEFAULT 'field_visit',
  file_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_visit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_visit_id UUID NOT NULL REFERENCES field_visits(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  public_id TEXT,
  title TEXT,
  document_type TEXT NOT NULL DEFAULT 'supporting_document',
  file_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_visit_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_visit_id UUID NOT NULL REFERENCES field_visits(id) ON DELETE CASCADE,
  action_required TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS field_officer_assignments_officer_idx ON field_officer_assignments(field_officer_id);
CREATE INDEX IF NOT EXISTS field_visits_officer_idx ON field_visits(field_officer_id);
CREATE INDEX IF NOT EXISTS field_visits_farmer_idx ON field_visits(farmer_id);
CREATE INDEX IF NOT EXISTS field_visits_farm_idx ON field_visits(farm_id);
CREATE INDEX IF NOT EXISTS field_visits_visit_date_idx ON field_visits(visit_date);
CREATE INDEX IF NOT EXISTS field_visit_photos_visit_idx ON field_visit_photos(field_visit_id);
CREATE INDEX IF NOT EXISTS field_visit_documents_visit_idx ON field_visit_documents(field_visit_id);
CREATE INDEX IF NOT EXISTS field_visit_followups_visit_idx ON field_visit_followups(field_visit_id);
