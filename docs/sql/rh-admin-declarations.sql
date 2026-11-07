-- Déclarations de prestation saisies par l'administration pour un collaborateur.
ALTER TABLE redaction_rh.activity_submissions
  ADD COLUMN IF NOT EXISTS source varchar(10) NOT NULL DEFAULT 'employee'
    CHECK (source IN ('employee', 'admin')),
  ADD COLUMN IF NOT EXISTS created_by_email varchar(320);
