-- Déduplication et reprise des e-mails / push des annonces collaborateurs.
-- À appliquer sur la base RH privée avant d’activer les notifications d’annonces.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.announcement_deliveries (
  account_id integer NOT NULL,
  revision varchar(100) NOT NULL,
  email_claimed_at timestamptz,
  email_sent_at timestamptz,
  push_claimed_at timestamptz,
  push_sent_at timestamptz,
  PRIMARY KEY (account_id, revision)
);
-- Rôle applicatif : SELECT, INSERT, UPDATE uniquement sur cette table.
COMMIT;
