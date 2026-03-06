-- Añadir columna para imagen de portada en avances de bitácora.
-- Ejecutar en la BD de bitácora (ej. PGPASSWORD=... psql -h HOST -p 5432 -U bitacora_admin -d bitacora_db -f scripts/alter-bitacora-add-cover.sql)

ALTER TABLE project_logs
  ADD COLUMN IF NOT EXISTS cover_image VARCHAR(512) DEFAULT NULL;

COMMENT ON COLUMN project_logs.cover_image IS 'Ruta o URL de la imagen de portada del avance (ej. /api/bitacora/uploads/xxx.jpg)';
