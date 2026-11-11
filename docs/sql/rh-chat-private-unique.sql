-- Une seule conversation privée par paire de collaborateurs (comme WhatsApp).
BEGIN;

CREATE TEMP TABLE chat_room_dups ON COMMIT DROP AS
WITH pairs AS (
  SELECT r.id AS room_id,
         r.created_at,
         min(m.collaborator_id::text) AS a,
         max(m.collaborator_id::text) AS b
  FROM redaction_rh.chat_rooms r
  JOIN redaction_rh.chat_room_members m ON m.room_id = r.id
  WHERE r.kind = 'private'
  GROUP BY r.id, r.created_at
  HAVING count(*) = 2
), ranked AS (
  SELECT room_id,
         first_value(room_id) OVER (PARTITION BY a, b ORDER BY created_at, room_id) AS keeper,
         row_number() OVER (PARTITION BY a, b ORDER BY created_at, room_id) AS position
  FROM pairs
)
SELECT room_id AS dup, keeper FROM ranked WHERE position > 1;

-- Déplacer les messages vers la conversation conservée.
UPDATE redaction_rh.chat_messages m
SET room_id = d.keeper
FROM chat_room_dups d
WHERE m.room_id = d.dup;

-- Fusionner les accusés de lecture.
INSERT INTO redaction_rh.chat_room_reads (room_id, collaborator_id, read_at)
SELECT d.keeper, r.collaborator_id, r.read_at
FROM redaction_rh.chat_room_reads r
JOIN chat_room_dups d ON d.dup = r.room_id
ON CONFLICT (room_id, collaborator_id) DO UPDATE
SET read_at = GREATEST(redaction_rh.chat_room_reads.read_at, EXCLUDED.read_at);

DELETE FROM redaction_rh.chat_room_reads r
USING chat_room_dups d
WHERE r.room_id = d.dup;

-- Les indicateurs de saisie pointent vers la conversation conservée.
UPDATE redaction_rh.chat_presence p
SET typing_room = d.keeper
FROM chat_room_dups d
WHERE p.typing_room = d.dup;

DELETE FROM redaction_rh.chat_room_members m
USING chat_room_dups d
WHERE m.room_id = d.dup;

DELETE FROM redaction_rh.chat_rooms r
USING chat_room_dups d
WHERE r.id = d.dup;

-- Clé canonique (paire triée) pour empêcher toute nouvelle duplication, même en concurrence.
ALTER TABLE redaction_rh.chat_rooms ADD COLUMN IF NOT EXISTS private_key varchar(80);

UPDATE redaction_rh.chat_rooms r
SET private_key = x.key
FROM (
  SELECT r2.id,
         min(m.collaborator_id::text) || ':' || max(m.collaborator_id::text) AS key
  FROM redaction_rh.chat_rooms r2
  JOIN redaction_rh.chat_room_members m ON m.room_id = r2.id
  WHERE r2.kind = 'private'
  GROUP BY r2.id
  HAVING count(*) = 2
) x
WHERE r.id = x.id AND r.private_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_private_key_idx
  ON redaction_rh.chat_rooms (private_key)
  WHERE private_key IS NOT NULL;

COMMIT;
