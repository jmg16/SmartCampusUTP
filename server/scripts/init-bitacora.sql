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

