-- Déduplication des rappels quotidiens de signature sortie / déclaration de prestation.
-- Appliquer sur la base RH après sauvegarde, avant le déploiement de l’endpoint cron.
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.work_reminders (
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  reminder_type varchar(16) NOT NULL CHECK (reminder_type IN ('sortie','prestation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collaborator_id, work_date, reminder_type)
);
-- Accorder au rôle applicatif uniquement SELECT, INSERT sur redaction_rh.work_reminders.
COMMIT;
