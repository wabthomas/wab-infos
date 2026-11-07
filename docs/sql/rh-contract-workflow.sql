-- Appliquer après rh-initial.sql et rh-account-links.sql, après sauvegarde.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.contract_templates (
  id uuid PRIMARY KEY,
  kind varchar(3) NOT NULL CHECK(kind IN ('CDD','CDI')),
  title varchar(120) NOT NULL,
  signature_place varchar(120) NOT NULL DEFAULT '',
  signature_date date,
  clauses text NOT NULL CHECK(length(clauses) BETWEEN 1 AND 12000),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  archived boolean NOT NULL DEFAULT false,
  created_by varchar(320) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contract_templates_active_idx ON redaction_rh.contract_templates(archived,updated_at DESC);
CREATE TABLE IF NOT EXISTS redaction_rh.contract_template_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES redaction_rh.contract_templates(id),
  actor_email varchar(320) NOT NULL,
  action varchar(16) NOT NULL CHECK(action IN ('create','update','archive')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS redaction_rh.contract_cases (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  kind varchar(3) NOT NULL CHECK(kind IN ('CDD','CDI')),
  job_title varchar(160) NOT NULL,
  work_location varchar(180) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  salary numeric(15,2) NOT NULL CHECK(salary>0),
  currency varchar(3) NOT NULL CHECK(currency IN ('CDF','USD')),
  clauses text NOT NULL CHECK(length(clauses) BETWEEN 1 AND 12000),
  birth_place varchar(120) NOT NULL DEFAULT '',
  signature_place varchar(120) NOT NULL DEFAULT '',
  signature_date date,
  party_snapshot jsonb,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','proposed','pending_approval','accepted','declined','archived')),
  prepared_by varchar(320) NOT NULL,
  legal_reviewed_by varchar(320),
  proposed_at timestamptz,
  proposed_account_id integer,
  proposed_account_email varchar(320),
  employer_snapshot jsonb,
  signature_bytes bytea,
  seal_bytes bytea,
  employee_signature varchar(120),
  employee_signature_bytes bytea,
  employee_account_id integer,
  employee_account_email varchar(320),
  declined_at timestamptz,
  accepted_at timestamptz,
  approved_at timestamptz,
  approved_by varchar(320),
  consent_company_rules boolean NOT NULL DEFAULT false,
  consent_work_rules boolean NOT NULL DEFAULT false,
  consent_snapshot jsonb,
  signature_mode varchar(8),
  pdf_bytes bytea,
  pdf_sha256 bytea,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind='CDD' AND end_date IS NOT NULL AND end_date>start_date) OR (kind='CDI' AND end_date IS NULL)),
  CHECK (status NOT IN ('proposed','accepted','declined') OR (legal_reviewed_by IS NOT NULL AND proposed_at IS NOT NULL AND employer_snapshot IS NOT NULL AND proposed_account_id IS NOT NULL AND proposed_account_email IS NOT NULL)),
  CHECK (status <> 'declined' OR declined_at IS NOT NULL),
  CHECK (status <> 'pending_approval' OR (employee_signature IS NOT NULL AND employee_signature_bytes IS NOT NULL AND employee_account_id IS NOT NULL AND employee_account_email IS NOT NULL AND accepted_at IS NOT NULL AND pdf_bytes IS NOT NULL AND pdf_sha256 IS NOT NULL AND consent_company_rules AND consent_work_rules)),
  CHECK (status <> 'accepted' OR (employee_signature IS NOT NULL AND employee_signature_bytes IS NOT NULL AND employee_account_id IS NOT NULL AND employee_account_email IS NOT NULL AND accepted_at IS NOT NULL AND pdf_bytes IS NOT NULL AND pdf_sha256 IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS contract_cases_person_idx ON redaction_rh.contract_cases(collaborator_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS redaction_rh.contract_case_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES redaction_rh.contract_cases(id),
  actor_email varchar(320) NOT NULL,
  action varchar(16) NOT NULL CHECK(action IN ('create','update','propose','accept','sign','approve','decline','archive','download')),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
-- Rôle applicatif : SELECT,INSERT,UPDATE sur contract_cases et contract_templates ; INSERT sur
-- contract_case_events et contract_template_events, USAGE sur leurs séquences. Aucun DELETE, aucun accès Strapi.
-- Durées de conservation, révocation et contrôles d'identité à valider en RDC.
CREATE TABLE IF NOT EXISTS redaction_rh.contract_reminders (
  contract_id uuid NOT NULL REFERENCES redaction_rh.contract_cases(id),
  days_before smallint NOT NULL CHECK(days_before IN (60,30,7,0)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(contract_id,days_before)
);
