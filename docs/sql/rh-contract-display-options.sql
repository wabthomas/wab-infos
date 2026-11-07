-- Options d'affichage des informations du contrat (true = affiché).
ALTER TABLE redaction_rh.contract_cases
  ADD COLUMN IF NOT EXISTS display_options jsonb NOT NULL DEFAULT '{}'::jsonb;
