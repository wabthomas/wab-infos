-- Après rh-payouts-attendance.sql, rh-declarations.sql, rh-prestations.sql,
-- rh-paiements-historiques.sql. Sauvegarder la base privée avant application.
BEGIN;
CREATE TABLE redaction_rh.record_sheet_exports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_email varchar(320) NOT NULL,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  sheet_type varchar(16) NOT NULL CHECK (sheet_type IN ('presence','prestations','paiements')),
  from_date date NOT NULL,
  through_date date NOT NULL,
  row_count integer NOT NULL CHECK (row_count BETWEEN 0 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (through_date >= from_date)
);
CREATE INDEX record_sheet_exports_person_idx ON redaction_rh.record_sheet_exports(collaborator_id,created_at DESC);
COMMIT;
-- Rôle applicatif : INSERT sur record_sheet_exports et USAGE/SELECT sur sa séquence.
-- Pas d'accès Strapi, pas de DELETE/TRUNCATE. Définir une conservation réglementaire.
