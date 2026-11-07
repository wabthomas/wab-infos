-- Liens temporaires pour l'ouverture des PDF/PNG RH dans le navigateur externe de l'APK.
-- Appliquer après rh-initial.sql et sauvegarde. Ne jamais donner de droits au rôle public.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.browser_documents (
  token_hash varchar(64) PRIMARY KEY,
  owner_email varchar(320) NOT NULL,
  mime_type varchar(20) NOT NULL CHECK (mime_type IN ('application/pdf','image/png','image/jpeg','text/csv')),
  file_name varchar(120) NOT NULL,
  file_bytes bytea NOT NULL CHECK (octet_length(file_bytes) BETWEEN 16 AND 12000000),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS browser_documents_expiry_idx ON redaction_rh.browser_documents(expires_at);
COMMIT;
-- Rôle applicatif uniquement : SELECT, INSERT, DELETE sur browser_documents ; pas de GRANT PUBLIC.
