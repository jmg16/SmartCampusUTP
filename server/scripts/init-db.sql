-- Tabla para interesados en el proyecto Smart Campus UTP Chiriquí
CREATE TABLE IF NOT EXISTS interesados (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(255) NOT NULL,
  correo     VARCHAR(255) NOT NULL UNIQUE,
  rol        VARCHAR(100) NOT NULL,
  creado_en  TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interesados_correo ON interesados (correo);
