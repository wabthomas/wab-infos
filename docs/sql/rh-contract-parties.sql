-- Après rh-contract-workflow.sql et sauvegarde de PostgreSQL. Ne modifie aucun contrat déjà transmis.
BEGIN;
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS birth_place varchar(120) NOT NULL DEFAULT '';
ALTER TABLE redaction_rh.contract_cases ADD COLUMN IF NOT EXISTS party_snapshot jsonb;
COMMIT;
-- Le rôle applicatif doit déjà posséder SELECT et UPDATE sur contract_cases.
-- Appliquer cette migration en production AVANT de déployer les routes contrats mises à jour.
-- Les contrats déjà transmis restent sans party_snapshot ; leurs PDF acceptés demeurent inchangés.
-- Les nouveaux contrats exigent la date de naissance, l'adresse et le téléphone dans employee_profiles,
-- et un lieu de naissance distinct saisi dans le brouillon contrat avant la transmission.
