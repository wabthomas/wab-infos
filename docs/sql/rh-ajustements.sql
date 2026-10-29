-- Après rh-soldes-initiaux.sql, pour la préproduction financière privée.
BEGIN;
CREATE TABLE redaction_rh.balance_adjustments (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  currency varchar(3) NOT NULL CHECK (currency IN ('CDF','USD')),
  direction varchar(6) NOT NULL CHECK (direction IN ('credit','debit')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 99999999999999999),
  reason varchar(500) NOT NULL CHECK (length(trim(reason)) > 0),
  status varchar(12) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','cancelled')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  CHECK ((status='validated') = (validated_at IS NOT NULL))
);
CREATE INDEX balance_adjustments_person_idx ON redaction_rh.balance_adjustments (collaborator_id,currency,status);
ALTER TABLE redaction_rh.audit_log ADD COLUMN adjustment_id uuid REFERENCES redaction_rh.balance_adjustments(id);
COMMIT;
