-- Base RH privée : appliquer après rh-initial.sql avec le propriétaire, après sauvegarde.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.official_templates (
  id uuid PRIMARY KEY,
  kind varchar(12) NOT NULL CHECK (kind IN ('lettre','communique')),
  title varchar(120) NOT NULL,
  subject varchar(200) NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived boolean NOT NULL DEFAULT false,
  created_by varchar(320) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS official_templates_active_idx ON redaction_rh.official_templates(archived,updated_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS redaction_rh.official_template_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES redaction_rh.official_templates(id),
  actor_email varchar(320) NOT NULL,
  action varchar(16) NOT NULL CHECK (action IN ('create','update','archive')),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
-- Rôle applicatif : SELECT, INSERT, UPDATE sur official_templates ; INSERT sur
-- official_template_events (+ USAGE sur sa séquence). Ne pas lui accorder DELETE.
-- Tables privées : ne pas les exposer via Strapi ni au compte lecteur.
