-- À appliquer après rh-contract-workflow.sql, avant de déployer la nouvelle limite des clauses.
-- Migration additive de la limite sur les modèles et dossiers existants : aucune clause n'est modifiée.
BEGIN;
ALTER TABLE redaction_rh.contract_templates DROP CONSTRAINT IF EXISTS contract_templates_clauses_check;
ALTER TABLE redaction_rh.contract_templates ADD CONSTRAINT contract_templates_clauses_check CHECK(length(clauses) BETWEEN 1 AND 15000);
ALTER TABLE redaction_rh.contract_cases DROP CONSTRAINT IF EXISTS contract_cases_clauses_check;
ALTER TABLE redaction_rh.contract_cases ADD CONSTRAINT contract_cases_clauses_check CHECK(length(clauses) BETWEEN 1 AND 15000);
COMMIT;
