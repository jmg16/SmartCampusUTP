-- Tabla para bitácora de avances del proyecto Smart Campus
CREATE TABLE IF NOT EXISTS project_logs (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT NOT NULL,
  status_tags  VARCHAR(100) NOT NULL, -- Ej: 'En progreso', 'Completado', 'Bloqueado'
  author       VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cover_image  VARCHAR(512) DEFAULT NULL
);

-- Índice para ordenar y filtrar por fecha de creación
CREATE INDEX IF NOT EXISTS idx_project_logs_created_at
  ON project_logs (created_at DESC);

-- Tabla para eventos del proyecto Smart Campus
CREATE TABLE IF NOT EXISTS project_events (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  event_date  TIMESTAMPTZ NOT NULL,
  location    VARCHAR(255) NOT NULL,
  author      VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_events_event_date
  ON project_events (event_date DESC);

-- Tabla para imágenes asociadas a eventos (1 a 5 por evento)
CREATE TABLE IF NOT EXISTS project_event_images (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES project_events(id) ON DELETE CASCADE,
  image_url  VARCHAR(512) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_project_event_images_event_id
  ON project_event_images (event_id);

CREATE INDEX IF NOT EXISTS idx_project_event_images_sort
  ON project_event_images (event_id, sort_order);

-- Tabla para librería de modelos 3D
CREATE TABLE IF NOT EXISTS model_library (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  category       VARCHAR(100) NOT NULL,
  reference_code VARCHAR(100) NOT NULL,
  description    TEXT,
  file_url       VARCHAR(512) NOT NULL,
  file_size      BIGINT,
  author         VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_library_category
  ON model_library (category);

CREATE INDEX IF NOT EXISTS idx_model_library_created_at
  ON model_library (created_at DESC);

