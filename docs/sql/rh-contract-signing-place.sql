-- Appliquer après rh-contract-workflow.sql et rh-contract-parties.sql, avant le déploiement de la version qui utilise le lieu et la date de signature.
-- Migration additive : les anciens modèles et dossiers gardent des valeurs nulles ; les PDF acceptés restent figés.
BEGIN;
ALTER TABLE redaction_rh.contract_templates ADD COLUMN IF NOT EXISTS signature_place varchar(120) NOT NULL DEFAULT '';
ALTER TABLE redaction_rh.contract_templates ADD COLUMN IF NOT EXISTS signature_date date;
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS signature_place varchar(120) NOT NULL DEFAULT '';
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS signature_date date;
COMMIT;
