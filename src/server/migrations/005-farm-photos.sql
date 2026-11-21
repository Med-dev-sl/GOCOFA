CREATE TABLE IF NOT EXISTS farm_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  public_id TEXT,
  caption TEXT,
  photo_category TEXT NOT NULL DEFAULT 'land_production',
  file_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS farm_photos_farm_idx ON farm_photos(farm_id);
CREATE INDEX IF NOT EXISTS farm_photos_category_idx ON farm_photos(photo_category);
