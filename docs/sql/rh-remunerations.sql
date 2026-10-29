-- Exécuter une seule fois après les migrations RH précédentes, dans la base privée.
BEGIN;
CREATE TABLE redaction_rh.remunerations (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  period date NOT NULL CHECK (extract(day FROM period) = 1),
  currency varchar(3) NOT NULL CHECK (currency IN ('CDF','USD')),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0 AND amount_minor <= 99999999999999999),
  status varchar(12) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','cancelled')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'validated') = (validated_at IS NOT NULL))
);
CREATE UNIQUE INDEX remunerations_open_period_idx ON redaction_rh.remunerations (collaborator_id,period,currency) WHERE status IN ('draft','validated');
CREATE INDEX remunerations_person_period_idx ON redaction_rh.remunerations (collaborator_id,period DESC);
ALTER TABLE redaction_rh.audit_log ADD COLUMN remuneration_id uuid REFERENCES redaction_rh.remunerations(id);
COMMIT;
