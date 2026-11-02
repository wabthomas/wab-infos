-- Appliquer après rh-account-links.sql, avec le propriétaire du schéma RH.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.release_acknowledgements (
  account_id integer NOT NULL,
  release_id varchar(100) NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, release_id)
);
CREATE TABLE IF NOT EXISTS redaction_rh.release_push_deliveries (
  account_id integer NOT NULL,
  release_id varchar(100) NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  PRIMARY KEY (account_id, release_id)
);
COMMIT;
-- Accorder au compte applicatif SELECT/INSERT sur release_acknowledgements,
-- SELECT/INSERT/UPDATE sur release_push_deliveries, sans DELETE ni TRUNCATE.
