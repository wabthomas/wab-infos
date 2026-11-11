-- Curseur de lecture par collaborateur et par conversation RH.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.chat_room_reads (
  room_id uuid NOT NULL REFERENCES redaction_rh.chat_rooms(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL,
  PRIMARY KEY (room_id, collaborator_id)
);
COMMIT;
