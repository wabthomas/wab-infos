-- Cartes de service RH et notification d’émission, après rh-notifications.sql et rh-fiches.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.service_cards (
 id uuid PRIMARY KEY,
 collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id) ON DELETE CASCADE,
 card_number varchar(80) NOT NULL,
 issued_at date NOT NULL,
 expires_at date NOT NULL,
 status varchar(12) NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 created_by varchar(320) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at >= issued_at)
);
CREATE INDEX IF NOT EXISTS service_cards_employee_idx ON redaction_rh.service_cards(collaborator_id,issued_at DESC);
ALTER TABLE redaction_rh.notifications DROP CONSTRAINT IF EXISTS notifications_event_type_check;
ALTER TABLE redaction_rh.notifications ADD CONSTRAINT notifications_event_type_check CHECK(event_type IN ('absence','prestation','remuneration','retrait','service_card'));
COMMIT;
