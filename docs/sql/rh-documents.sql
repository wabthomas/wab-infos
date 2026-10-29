-- À exécuter après rh-initial.sql, rh-account-links.sql et rh-roles.sql, dans la base RH privée.
BEGIN;
CREATE TABLE redaction_rh.documents (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  title varchar(120) NOT NULL,
  category varchar(20) NOT NULL CHECK (category IN ('contrat','attestation','autre')),
  file_type varchar(10) NOT NULL CHECK (file_type IN ('pdf','jpeg','png')),
  file_bytes bytea NOT NULL CHECK (octet_length(file_bytes) BETWEEN 1 AND 5242880),
  archived boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id,collaborator_id)
);
CREATE TABLE redaction_rh.document_shares (
  document_id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL,
  account_id integer NOT NULL,
  account_email varchar(320) NOT NULL,
  FOREIGN KEY (document_id,collaborator_id) REFERENCES redaction_rh.documents (id,collaborator_id),
  FOREIGN KEY (collaborator_id,account_id,account_email) REFERENCES redaction_rh.account_links (collaborator_id,account_id,account_email) ON DELETE CASCADE
);
CREATE INDEX documents_person_idx ON redaction_rh.documents (collaborator_id,created_at DESC);
ALTER TABLE redaction_rh.audit_log ADD COLUMN document_id uuid REFERENCES redaction_rh.documents(id);
COMMIT;
