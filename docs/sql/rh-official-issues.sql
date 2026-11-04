-- À appliquer après rh-official-templates.sql, avec sauvegarde préalable.
BEGIN;
CREATE SEQUENCE IF NOT EXISTS redaction_rh.official_issue_reference_seq AS bigint;
CREATE TABLE IF NOT EXISTS redaction_rh.official_issues (
  id uuid PRIMARY KEY,
  token_hash bytea NOT NULL UNIQUE,
  reference varchar(80),
  kind varchar(12) NOT NULL CHECK (kind IN ('lettre','communique')),
  company_name varchar(160) NOT NULL,
  company_registration varchar(160) NOT NULL DEFAULT '',
  company_tax_id varchar(100) NOT NULL DEFAULT '',
  document_date varchar(150) NOT NULL,
  content_hash bytea NOT NULL,
  snapshot jsonb NOT NULL,
  png_hash bytea,
  png_bytes bytea,
  status varchar(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','revoked')),
  created_by varchar(320) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  issued_at timestamptz,
  CHECK ((status='issued' AND png_hash IS NOT NULL AND png_bytes IS NOT NULL AND issued_at IS NOT NULL)
      OR status <> 'issued')
);
-- Compatible avec une table déjà créée avant l’introduction de la référence.
ALTER TABLE redaction_rh.official_issues ADD COLUMN IF NOT EXISTS reference varchar(80);
CREATE UNIQUE INDEX IF NOT EXISTS official_issues_reference_unique ON redaction_rh.official_issues(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS official_issues_created_idx ON redaction_rh.official_issues(created_by,created_at DESC);
COMMIT;
-- Accorder au seul rôle applicatif SELECT,INSERT,UPDATE sur official_issues et USAGE sur
-- official_issue_reference_seq ;
-- jamais DELETE. Ne pas exposer cette table à Strapi ou au rôle public.
-- Les brouillons pending expirés et les documents révoqués nécessitent une
-- politique de conservation et une purge administrateur distincte.
