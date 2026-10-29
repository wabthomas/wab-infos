-- Après les migrations RH précédentes, dans la base privée uniquement.
BEGIN;
CREATE TABLE redaction_rh.withdrawals (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  idempotency_key uuid NOT NULL UNIQUE,
  requester_email varchar(320) NOT NULL,
  currency varchar(3) NOT NULL CHECK (currency IN ('CDF','USD')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 99999999999999999),
  method varchar(20) NOT NULL CHECK (method IN ('mobile_money','virement','especes','autre')),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','paid')),
  decision_note varchar(500) NOT NULL DEFAULT '',
  payment_date date,
  payment_reference varchar(150),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='paid') = (payment_date IS NOT NULL))
);
CREATE INDEX withdrawal_person_currency_idx ON redaction_rh.withdrawals (collaborator_id,currency,status);
CREATE UNIQUE INDEX withdrawal_reference_idx ON redaction_rh.withdrawals (method, lower(payment_reference)) WHERE status='paid' AND payment_reference IS NOT NULL AND payment_reference <> '';
ALTER TABLE redaction_rh.audit_log ADD COLUMN withdrawal_id uuid REFERENCES redaction_rh.withdrawals(id);
COMMIT;
