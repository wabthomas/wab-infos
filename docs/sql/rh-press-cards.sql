-- Après rh-service-cards.sql ; sauvegarder avant application. La carte de presse reste une carte d'entreprise.
BEGIN;
ALTER TABLE redaction_rh.service_cards ADD COLUMN IF NOT EXISTS card_type varchar(12) NOT NULL DEFAULT 'service';
ALTER TABLE redaction_rh.service_cards ADD COLUMN IF NOT EXISTS verification_token varchar(64);
ALTER TABLE redaction_rh.service_cards DROP CONSTRAINT IF EXISTS service_cards_type_check;
ALTER TABLE redaction_rh.service_cards ADD CONSTRAINT service_cards_type_check CHECK (card_type IN ('service','press') AND (card_type <> 'press' OR verification_token IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS service_cards_verify_token_idx ON redaction_rh.service_cards(verification_token) WHERE verification_token IS NOT NULL;
COMMIT;
-- Seul le rôle applicatif a SELECT/INSERT/UPDATE. La page publique ne doit exposer ni photo,
-- ni nom du titulaire, ni dossier RH. URL QR porteuse d'un jeton : masquer le jeton dans les logs.
