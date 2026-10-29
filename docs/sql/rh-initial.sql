-- À exécuter manuellement par un propriétaire de base après sauvegarde.
-- Les tables RH ne sont pas exposées par les API Strapi.
BEGIN;
CREATE SCHEMA IF NOT EXISTS redaction_rh;
CREATE TABLE redaction_rh.collaborators (
  id uuid PRIMARY KEY,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  job_title varchar(150) NOT NULL,
  team varchar(150) NOT NULL,
  contract_status varchar(100) NOT NULL,
  start_date date,
  archived boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE redaction_rh.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_email varchar(320) NOT NULL,
  action varchar(30) NOT NULL,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collaborators_archived_name_idx ON redaction_rh.collaborators (archived, last_name, first_name);
CREATE INDEX audit_collaborator_idx ON redaction_rh.audit_log (collaborator_id, created_at);
COMMIT;
