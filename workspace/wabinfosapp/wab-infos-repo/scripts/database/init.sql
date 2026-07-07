-- Wab-infos PostgreSQL initialization
-- Extensions et configuration de base

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Index de recherche full-text (utilisé par Strapi + requêtes custom)
-- Les tables Strapi seront créées automatiquement par les migrations Strapi

-- Vue matérialisée pour les articles les plus lus (rafraîchie périodiquement)
-- Créée après le premier démarrage de Strapi via le script de maintenance

COMMENT ON DATABASE wab_infos IS 'Base de données Wab-infos — CMS Strapi + analytics';
