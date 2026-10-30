-- Messagerie RH privée temps réel par polling, dépôt binaire privé et présence.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.chat_rooms (
 id uuid PRIMARY KEY, kind varchar(8) NOT NULL CHECK(kind IN ('group','private')), title varchar(120) NOT NULL,
 created_by uuid REFERENCES redaction_rh.collaborators(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS redaction_rh.chat_room_members (
 room_id uuid NOT NULL REFERENCES redaction_rh.chat_rooms(id) ON DELETE CASCADE,
 collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id) ON DELETE CASCADE,
 PRIMARY KEY(room_id,collaborator_id)
);
CREATE TABLE IF NOT EXISTS redaction_rh.chat_messages (
 id uuid PRIMARY KEY, room_id uuid NOT NULL REFERENCES redaction_rh.chat_rooms(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id), reply_to uuid REFERENCES redaction_rh.chat_messages(id),
 body varchar(4000) NOT NULL DEFAULT '', file_name varchar(255), file_mime varchar(100), file_bytes bytea,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((file_bytes IS NULL)=(file_name IS NULL)), CHECK ((file_bytes IS NULL)=(file_mime IS NULL)),
 CHECK (length(body)>0 OR file_bytes IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS chat_messages_room_idx ON redaction_rh.chat_messages(room_id,created_at DESC);
CREATE TABLE IF NOT EXISTS redaction_rh.chat_presence (
 collaborator_id uuid PRIMARY KEY REFERENCES redaction_rh.collaborators(id) ON DELETE CASCADE,
 last_seen timestamptz NOT NULL DEFAULT now(), typing_room uuid REFERENCES redaction_rh.chat_rooms(id) ON DELETE SET NULL, typing_until timestamptz
);
INSERT INTO redaction_rh.chat_rooms(id,kind,title) VALUES('d0000000-0000-4000-8000-000000000001','group','Groupe rédaction') ON CONFLICT(id) DO NOTHING;
COMMIT;
