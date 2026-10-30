-- Étend les droits RH à la consultation sans modification (existant ou neuf).
BEGIN;
ALTER TABLE redaction_rh.role_grants DROP CONSTRAINT IF EXISTS role_grants_role_check;
ALTER TABLE redaction_rh.role_grants ADD CONSTRAINT role_grants_role_check CHECK (role IN ('rh_manager','rh_viewer','finance_manager','finance_viewer'));
COMMIT;
