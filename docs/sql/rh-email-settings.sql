-- Réglages SMTP dédiés aux notifications RH. Un seul enregistrement.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.email_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT true,
  host varchar(255) NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 465 CHECK (port BETWEEN 1 AND 65535),
  secure boolean NOT NULL DEFAULT true,
  username varchar(320) NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  from_email varchar(320) NOT NULL DEFAULT '',
  from_name varchar(120) NOT NULL DEFAULT 'Wab-infos RH',
  reply_to varchar(320) NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(320) NOT NULL DEFAULT ''
);
INSERT INTO redaction_rh.email_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
COMMIT;
