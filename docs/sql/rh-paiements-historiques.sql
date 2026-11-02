-- Appliquer après rh-retraits.sql et rh-account-links.sql, après sauvegarde de la base RH.
BEGIN;
CREATE TABLE redaction_rh.historical_payments (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  declarant_account_id integer NOT NULL,
  declarant_email varchar(320) NOT NULL,
  idempotency_key uuid NOT NULL UNIQUE,
  payment_date date NOT NULL,
  currency varchar(3) NOT NULL CHECK (currency IN ('CDF','USD')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 99999999999999999),
  kind varchar(20) NOT NULL CHECK (kind IN ('remuneration','prestation','prime','autre')),
  method varchar(20) NOT NULL CHECK (method IN ('mobile_money','virement','especes','autre')),
  reference varchar(150) NOT NULL DEFAULT '',
  note varchar(500) NOT NULL DEFAULT '',
  status varchar(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','cancelled')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  review_note varchar(500) NOT NULL DEFAULT '',
  verification_source varchar(20) CHECK (verification_source IN ('receipt','bank','cashbook','other')),
  matched_withdrawal_id uuid REFERENCES redaction_rh.withdrawals(id),
  reviewer_email varchar(320),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'verified' OR (reviewer_email IS NOT NULL AND reviewed_at IS NOT NULL AND verification_source IS NOT NULL)),
  CHECK (status = 'verified' OR matched_withdrawal_id IS NULL)
);
CREATE INDEX historical_payments_person_date_idx ON redaction_rh.historical_payments (collaborator_id,payment_date DESC,id DESC);
CREATE INDEX historical_payments_review_idx ON redaction_rh.historical_payments (status,created_at DESC) WHERE status='pending';
CREATE UNIQUE INDEX historical_payments_withdrawal_match_idx ON redaction_rh.historical_payments (matched_withdrawal_id) WHERE matched_withdrawal_id IS NOT NULL;
CREATE TABLE redaction_rh.historical_payment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES redaction_rh.historical_payments(id),
  actor_email varchar(320) NOT NULL,
  action varchar(20) NOT NULL CHECK (action IN ('declare','cancel','verify','reject')),
  note varchar(500) NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX historical_payment_events_payment_idx ON redaction_rh.historical_payment_events(payment_id,occurred_at);
CREATE TABLE redaction_rh.historical_payment_report_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_email varchar(320) NOT NULL,
  from_date date NOT NULL,
  through_date date NOT NULL,
  report_format varchar(12) NOT NULL CHECK (report_format IN ('summary','detail','events')),
  row_count integer NOT NULL CHECK (row_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
-- Compte applicatif : SELECT/INSERT/UPDATE sur historical_payments,
-- SELECT/INSERT sur historical_payment_events et INSERT sur historical_payment_report_audit
-- + USAGE/SELECT sur leurs séquences.
-- Ne pas accorder DELETE ni TRUNCATE : les décisions et l'audit ne sont pas effacés.
