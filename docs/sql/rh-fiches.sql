-- Compléments persistants des fiches RH (photo et champs personnels/professionnels).
-- À appliquer après les migrations RH de base.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.employee_profiles (
  collaborator_id uuid PRIMARY KEY REFERENCES redaction_rh.collaborators(id) ON DELETE CASCADE,
  birth_date date,
  employee_number varchar(80) UNIQUE,
  work_location varchar(180),
  contract_type varchar(100),
  contract_end_date date,
  phone varchar(40),
  work_email varchar(320),
  address varchar(300),
  country varchar(100) NOT NULL DEFAULT 'République démocratique du Congo',
  province varchar(100),
  city varchar(100),
  emergency_contact varchar(180),
  specialty varchar(180),
  languages varchar(180),
  signature varchar(120),
  photo_bytes bytea,
  photo_mime varchar(30),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((photo_bytes IS NULL) = (photo_mime IS NULL)),
  CHECK (photo_mime IS NULL OR photo_mime IN ('image/jpeg','image/png','image/webp'))
);
ALTER TABLE redaction_rh.employee_profiles ADD COLUMN IF NOT EXISTS country varchar(100) NOT NULL DEFAULT 'République démocratique du Congo';
ALTER TABLE redaction_rh.employee_profiles ADD COLUMN IF NOT EXISTS province varchar(100);
ALTER TABLE redaction_rh.employee_profiles ADD COLUMN IF NOT EXISTS city varchar(100);
ALTER TABLE redaction_rh.employee_profiles ADD COLUMN IF NOT EXISTS signature varchar(120);
CREATE TABLE IF NOT EXISTS redaction_rh.organization_assets (
  asset_key varchar(40) PRIMARY KEY,
  file_bytes bytea NOT NULL,
  mime_type varchar(30) NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
  updated_by varchar(320) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
