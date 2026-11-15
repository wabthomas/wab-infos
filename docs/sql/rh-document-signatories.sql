-- Signataires des documents RH : un seul signataire actif par défaut.
BEGIN;

CREATE TABLE IF NOT EXISTS redaction_rh.document_signatories (
  id uuid PRIMARY KEY,
  full_name varchar(160) NOT NULL CHECK (length(trim(full_name)) > 0),
  title varchar(100) NOT NULL CHECK (length(trim(title)) > 0),
  signature_bytes bytea,
  signature_mime varchar(40),
  active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS document_signatories_one_default_idx
  ON redaction_rh.document_signatories (is_default)
  WHERE is_default AND active;

-- Reprendre le DG actuel (paramètres + signature existante) comme premier signataire par défaut.
INSERT INTO redaction_rh.document_signatories (id, full_name, title, signature_bytes, signature_mime, active, is_default)
SELECT gen_random_uuid(),
       COALESCE((SELECT setting_value FROM redaction_rh.organization_settings WHERE setting_key = 'directorName'), 'Directeur Général'),
       COALESCE(NULLIF((SELECT setting_value FROM redaction_rh.organization_settings WHERE setting_key = 'directorTitle'), ''), 'Directeur Général'),
       (SELECT file_bytes FROM redaction_rh.organization_assets WHERE asset_key = 'director-signature'),
       (SELECT mime_type FROM redaction_rh.organization_assets WHERE asset_key = 'director-signature'),
       true, true
WHERE EXISTS (SELECT 1 FROM redaction_rh.organization_settings WHERE setting_key = 'directorName' AND length(trim(setting_value)) > 0)
  AND NOT EXISTS (SELECT 1 FROM redaction_rh.document_signatories);

COMMIT;
