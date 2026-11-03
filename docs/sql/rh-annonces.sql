-- Après rh-account-links.sql ; base RH privée uniquement.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.announcements (
  id varchar(40) PRIMARY KEY,
  title varchar(160) NOT NULL,
  body varchar(2000) NOT NULL,
  url varchar(500),
  active boolean NOT NULL DEFAULT true,
  updated_by varchar(320),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
