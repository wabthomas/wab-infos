-- Après rh-account-links.sql et les migrations RH précédentes.
BEGIN;
ALTER TABLE redaction_rh.account_links ADD CONSTRAINT account_links_identity_unique UNIQUE (collaborator_id,account_id,account_email);
CREATE TABLE redaction_rh.role_grants (
  collaborator_id uuid NOT NULL,
  account_id integer NOT NULL,
  account_email varchar(320) NOT NULL,
  role varchar(20) NOT NULL CHECK (role IN ('rh_manager','rh_viewer','finance_manager','finance_viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collaborator_id,role),
  FOREIGN KEY (collaborator_id,account_id,account_email) REFERENCES redaction_rh.account_links (collaborator_id,account_id,account_email) ON DELETE CASCADE
);
ALTER TABLE redaction_rh.audit_log ADD COLUMN rh_role varchar(20);
COMMIT;
