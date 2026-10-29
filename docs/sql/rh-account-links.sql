-- À exécuter une seule fois après les migrations RH précédentes.
BEGIN;
CREATE TABLE redaction_rh.account_links (
  collaborator_id uuid PRIMARY KEY REFERENCES redaction_rh.collaborators(id),
  account_id integer NOT NULL UNIQUE CHECK (account_id > 0),
  account_email varchar(320) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX account_links_email_idx ON redaction_rh.account_links (lower(account_email));
ALTER TABLE redaction_rh.audit_log ADD COLUMN linked_account_id integer;
COMMIT;
