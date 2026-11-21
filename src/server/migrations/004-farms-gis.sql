CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_code TEXT NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
  farm_name TEXT,
  declared_area NUMERIC(12,4),
  calculated_area NUMERIC(12,4),
  allocated_cocoa_area NUMERIC(12,4),
  ownership_type TEXT,
  farm_age INTEGER,
  crop_type TEXT DEFAULT 'cocoa',
  variety TEXT,
  production_estimate NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farm_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL DEFAULT 'point',
  coordinates GEOGRAPHY(POINT, 4326),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  accuracy_meters NUMERIC(10,2),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS farm_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  boundary GEOGRAPHY(POLYGON, 4326),
  geojson JSONB,
  area_hectares NUMERIC(12,4),
  capture_method TEXT DEFAULT 'gps_walk',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ
);

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

CREATE INDEX IF NOT EXISTS farms_farmer_idx ON farms(farmer_id);
CREATE INDEX IF NOT EXISTS farms_status_idx ON farms(status);
CREATE INDEX IF NOT EXISTS farm_locations_farm_idx ON farm_locations(farm_id);
CREATE INDEX IF NOT EXISTS farm_boundaries_farm_idx ON farm_boundaries(farm_id);
CREATE INDEX IF NOT EXISTS farm_photos_farm_idx ON farm_photos(farm_id);
CREATE INDEX IF NOT EXISTS farm_photos_category_idx ON farm_photos(photo_category);
