-- Après rh-fiches-exports.sql. URL temporaire pour ouvrir les PDF dans un navigateur
-- externe, même sans les cookies de la WebView. Sauvegarder avant application.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.record_sheet_pdf_links (
  token_hash char(64) PRIMARY KEY,
  export_id bigint NOT NULL UNIQUE REFERENCES redaction_rh.record_sheet_exports(id),
  actor_email varchar(320) NOT NULL,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  sheet_type varchar(16) NOT NULL CHECK (sheet_type IN ('presence','prestations','paiements')),
  pdf_bytes bytea NOT NULL CHECK (octet_length(pdf_bytes) BETWEEN 32 AND 12000000),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS record_sheet_pdf_links_expiry_idx ON redaction_rh.record_sheet_pdf_links(expires_at);
COMMIT;
-- Rôle applicatif : SELECT, INSERT, DELETE sur record_sheet_pdf_links.
-- Purger régulièrement les lignes expirées (suppression opportuniste à chaque création
-- uniquement). Le lien est un secret : ne pas le partager hors destinataires autorisés.
