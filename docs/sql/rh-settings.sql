-- Paramètres fonctionnels modifiables par super-administrateur (valeurs env comme valeurs initiales).
BEGIN;
CREATE TABLE IF NOT EXISTS redaction_rh.feature_settings (
 feature_key varchar(40) PRIMARY KEY,
 enabled boolean NOT NULL,
 updated_by varchar(320) NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
