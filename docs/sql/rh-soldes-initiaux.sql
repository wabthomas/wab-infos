-- Après rh-remunerations.sql et rh-retraits.sql, dans la base RH privée.
BEGIN;
CREATE TABLE redaction_rh.opening_balances (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  currency varchar(3) NOT NULL CHECK (currency IN ('CDF','USD')),
  through_month date NOT NULL CHECK (extract(day FROM through_month)=1),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0 AND amount_minor <= 99999999999999999),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id,currency)
);
ALTER TABLE redaction_rh.audit_log ADD COLUMN opening_balance_id uuid REFERENCES redaction_rh.opening_balances(id);
COMMIT;
