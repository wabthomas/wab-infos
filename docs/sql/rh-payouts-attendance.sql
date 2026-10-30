-- Après rh-initial.sql, rh-account-links.sql et rh-retraits.sql ; base privée uniquement.
BEGIN;

CREATE TABLE IF NOT EXISTS redaction_rh.payout_methods (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  kind varchar(15) NOT NULL CHECK (kind IN ('mobile_money','bank')),
  provider varchar(40) NOT NULL,
  account_name varchar(120) NOT NULL,
  account_number varchar(60) NOT NULL,
  currency varchar(3) NOT NULL CHECK (currency IN ('CDF','USD')),
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id, kind, provider, account_number)
);
CREATE INDEX IF NOT EXISTS payout_methods_person_idx ON redaction_rh.payout_methods (collaborator_id, active);

CREATE TABLE IF NOT EXISTS redaction_rh.currency_preferences (
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  currency varchar(3) NOT NULL CHECK (currency IN ('CDF','USD')),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collaborator_id, currency)
);

ALTER TABLE redaction_rh.withdrawals
  ADD COLUMN IF NOT EXISTS payout_method_id uuid REFERENCES redaction_rh.payout_methods(id),
  ADD COLUMN IF NOT EXISTS payout_label varchar(160);

CREATE TABLE IF NOT EXISTS redaction_rh.attendance (
  id uuid PRIMARY KEY,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  work_date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  note varchar(300),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id, work_date)
);
CREATE INDEX IF NOT EXISTS attendance_recent_idx ON redaction_rh.attendance (collaborator_id, work_date DESC);

COMMIT;
