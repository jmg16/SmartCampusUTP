const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Cargar .env.bitacora si existe (para que varios admins funcionen aunque PM2 no herede las variables)
const envBitacoraPath = path.join(__dirname, '.env.bitacora');
if (fs.existsSync(envBitacoraPath)) {
  try {
    const content = fs.readFileSync(envBitacoraPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!(key in process.env)) process.env[key] = val;
        }
      }
    }
    console.log('[bitacora] Variables cargadas desde .env.bitacora');
  } catch (e) {
    console.warn('[bitacora] No se pudo leer .env.bitacora:', e.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Carpeta para imágenes de portada de bitácora (crear si no existe)
const UPLOADS_BITACORA_DIR = path.join(__dirname, 'uploads', 'bitacora');
if (!fs.existsSync(UPLOADS_BITACORA_DIR)) {
  fs.mkdirSync(UPLOADS_BITACORA_DIR, { recursive: true });
}

// Carpeta para imágenes de eventos (crear si no existe)
const UPLOADS_SALONES_DIR = path.join(__dirname, 'uploads', 'salones');
if (!fs.existsSync(UPLOADS_SALONES_DIR)) {
  fs.mkdirSync(UPLOADS_SALONES_DIR, { recursive: true });
}

const UPLOADS_EDIFICIOS_DIR = path.join(__dirname, 'uploads', 'edificios');
if (!fs.existsSync(UPLOADS_EDIFICIOS_DIR)) {
  fs.mkdirSync(UPLOADS_EDIFICIOS_DIR, { recursive: true });
}

const UPLOADS_EVENTOS_DIR = path.join(__dirname, 'uploads', 'eventos');
if (!fs.existsSync(UPLOADS_EVENTOS_DIR)) {
  fs.mkdirSync(UPLOADS_EVENTOS_DIR, { recursive: true });
}

// Carpeta para modelos 3D (.glb)
const UPLOADS_MODELOS3D_DIR = path.join(__dirname, 'uploads', 'modelos3d');
if (!fs.existsSync(UPLOADS_MODELOS3D_DIR)) {
  fs.mkdirSync(UPLOADS_MODELOS3D_DIR, { recursive: true });
}

const storageBitacora = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_BITACORA_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
    const safe = `${req.params.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    cb(null, safe);
  },
});
const uploadBitacora = multer({
  storage: storageBitacora,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

// URL base pública (ej. https://smartcampus.utp.ac.pa) para que las imágenes de portada
// se carguen igual aunque el usuario entre por IP u otro host
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

// --- Multer para imágenes de eventos (1 a 5 por evento) ---
const storageEventos = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_EVENTOS_DIR),
  filename: (_req, file, cb) => {
    const ext =
      (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    cb(null, safe);
  },
});

const storageSalones = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_SALONES_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^a-z.]/g, '') || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext.startsWith('.') ? ext : `.${ext}`}`);
  },
});
const uploadSalonFoto = multer({
  storage: storageSalones,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype));
  },
});

const uploadEdificioFoto = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_EDIFICIOS_DIR),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^a-z.]/g, '') || '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext.startsWith('.') ? ext : `.${ext}`}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype));
  },
});

const uploadEventos = multer({
  storage: storageEventos,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

// --- Multer para modelos 3D (.glb, hasta 50 MB) ---
const storageModelos3d = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_MODELOS3D_DIR),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.glb`;
    cb(null, safe);
  },
});

const uploadModelo3d = multer({
  storage: storageModelos3d,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'model/gltf-binary' ||
      file.mimetype === 'application/octet-stream' ||
      file.originalname.toLowerCase().endsWith('.glb');
    cb(null, ok);
  },
});

function withAbsoluteCover(log) {
  if (!log || !log.cover_image) return log;
  const cover = log.cover_image;
  if (PUBLIC_BASE_URL && typeof cover === 'string' && cover.startsWith('/')) {
    return { ...log, cover_image: PUBLIC_BASE_URL + cover };
  }
  return log;
}

function withAbsoluteCoverList(rows) {
  return Array.isArray(rows) ? rows.map(withAbsoluteCover) : rows;
}

function withAbsoluteEventImages(event) {
  if (!event || !Array.isArray(event.images)) return event;
  const normalizedImages = event.images
    .filter((img) => typeof img === 'string' && img.trim())
    .map((img) => {
      const trimmed = img.trim();
      // Acepta URLs antiguas guardadas solo como nombre de archivo.
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      if (trimmed.startsWith('/')) return trimmed;
      return `/api/eventos/uploads/${trimmed}`;
    });
  return { ...event, images: normalizedImages };
}

function withAbsoluteEventImagesList(rows) {
  return Array.isArray(rows) ? rows.map(withAbsoluteEventImages) : rows;
}

app.use(cors({ origin: true }));
app.use(express.json());
// Servir imágenes de portada de bitácora (URL pública para el front)
app.use('/api/bitacora/uploads', express.static(UPLOADS_BITACORA_DIR));

// Servir imágenes de eventos (URL pública para el front)
app.use('/api/salones/uploads', express.static(UPLOADS_SALONES_DIR));
app.use('/api/eventos/uploads', express.static(UPLOADS_EVENTOS_DIR));

// Servir archivos de modelos 3D (.glb)
app.use('/api/modelos3d/uploads', express.static(UPLOADS_MODELOS3D_DIR));

// Pool principal (landing / interesados)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/smartcampus',
  max: 10,
});

// Pool para bitácora de proyecto (BD separada)
let bitacoraPool = null;
if (process.env.BITACORA_DATABASE_URL) {
  bitacoraPool = new Pool({
    connectionString: process.env.BITACORA_DATABASE_URL,
    max: 10,
  });
} else {
  console.warn(
    '[bitacora] BITACORA_DATABASE_URL no está definida. Los endpoints /api/bitacora devolverán 503 hasta configurarla.'
  );
}

// Configuración de autenticación para bitácora
const BITACORA_JWT_SECRET = process.env.BITACORA_JWT_SECRET;
const BITACORA_ADMIN_USER = process.env.BITACORA_ADMIN_USER;
const BITACORA_ADMIN_PASSWORD = process.env.BITACORA_ADMIN_PASSWORD;
// Opcional: más admins como "usuario1:contraseña1,usuario2:contraseña2"
const BITACORA_ADMIN_CREDENTIALS_RAW = process.env.BITACORA_ADMIN_CREDENTIALS || '';

function getBitacoraAdminList() {
  const list = [];
  if (BITACORA_ADMIN_USER && BITACORA_ADMIN_PASSWORD) {
    list.push({ user: BITACORA_ADMIN_USER, password: BITACORA_ADMIN_PASSWORD });
  }
  const parts = BITACORA_ADMIN_CREDENTIALS_RAW.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx > 0) {
      list.push({ user: part.slice(0, idx).trim(), password: part.slice(idx + 1).trim() });
    }
  }
  return list;
}

const BITACORA_ADMIN_LIST = getBitacoraAdminList();
const hasAnyAdmin = BITACORA_ADMIN_LIST.length > 0;

if (!BITACORA_JWT_SECRET || !hasAnyAdmin) {
  console.warn(
    '[bitacora] Faltan variables de entorno BITACORA_JWT_SECRET o al menos un admin (BITACORA_ADMIN_USER/PASSWORD o BITACORA_ADMIN_CREDENTIALS). Login y endpoints protegidos devolverán 503 hasta configurarlas.'
  );
} else {
  console.log('[bitacora] Admins cargados:', BITACORA_ADMIN_LIST.length, '→ usuarios:', BITACORA_ADMIN_LIST.map((c) => c.user).join(', '));
}

const BITACORA_STATUS = ['En progreso', 'Completado', 'Bloqueado'];

// Endpoint para listar nombres de administradores (requiere auth)
app.get('/api/bitacora/admins', requireBitacoraAuth, (_req, res) => {
  const nombres = BITACORA_ADMIN_LIST.map((a) => a.user);
  res.json({ ok: true, datos: nombres });
});

function ensureBitacoraDbConfig(res) {
  if (!bitacoraPool) {
    res.status(503).json({
      ok: false,
      mensaje: 'Servicio de bitácora no está configurado en el servidor.',
    });
    return false;
  }
  return true;
}

function ensureBitacoraConfig(res) {
  if (!ensureBitacoraDbConfig(res) || !BITACORA_JWT_SECRET || !hasAnyAdmin) {
    res.status(503).json({
      ok: false,
      mensaje: 'Servicio de bitácora no está configurado en el servidor.',
    });
    return false;
  }
  return true;
}

async function ensureEventosTable() {
  if (!bitacoraPool) return;
  try {
    await bitacoraPool.query(`
      CREATE TABLE IF NOT EXISTS project_events (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        event_date  TIMESTAMPTZ NOT NULL,
        location    VARCHAR(255) NOT NULL,
        author      VARCHAR(255) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await bitacoraPool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_events_event_date
      ON project_events (event_date DESC)
    `);

    await bitacoraPool.query(`
      CREATE TABLE IF NOT EXISTS project_event_images (
        id          SERIAL PRIMARY KEY,
        event_id    INTEGER NOT NULL REFERENCES project_events(id) ON DELETE CASCADE,
        image_url  VARCHAR(512) NOT NULL,
        sort_order  INTEGER NOT NULL DEFAULT 0
      )
    `);

    await bitacoraPool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_event_images_event_id
      ON project_event_images (event_id)
    `);

    await bitacoraPool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_event_images_sort
      ON project_event_images (event_id, sort_order)
    `);
  } catch (err) {
    console.error('[eventos] No se pudo asegurar la tabla project_events:', err.message);
  }
}

async function ensureModelLibraryTable() {
  if (!bitacoraPool) return;
  try {
    await bitacoraPool.query(`
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
      )
    `);
    await bitacoraPool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'model_library' AND column_name = 'reference_code'
        ) THEN
          ALTER TABLE model_library ADD COLUMN reference_code VARCHAR(100);
        END IF;
      END $$
    `);
    await bitacoraPool.query(`
      CREATE INDEX IF NOT EXISTS idx_model_library_category
      ON model_library (category)
    `);
    await bitacoraPool.query(`
      CREATE INDEX IF NOT EXISTS idx_model_library_created_at
      ON model_library (created_at DESC)
    `);
  } catch (err) {
    console.error('[modelos3d] No se pudo asegurar la tabla model_library:', err.message);
  }
}

// Los mismos edificios que muestra la página Gemelo 3D, con su visor BIM.
const EDIFICIOS_GEMELO = [
  { nombre: 'Facultad de Civil', bim: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/04fb93c3e1#embed=%7B%22isEnabled%22%3Atrue%7D' },
  { nombre: 'Cafetín', bim: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/085e61af29#embed=%7B%22isEnabled%22%3Atrue%7D' },
  { nombre: 'Facultad de Sistemas', bim: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/ec603815fc#embed=%7B%22isEnabled%22%3Atrue%7D' },
  { nombre: 'Facultad de Ciencia y Tecnología', bim: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/4c1ad7027c#embed=%7B%22isEnabled%22%3Atrue%7D' },
  { nombre: 'Talleres', bim: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/133fa6e1d8#embed=%7B%22isEnabled%22%3Atrue%7D' },
  { nombre: 'Facultad de Eléctrica', bim: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/1c557af3de#embed=%7B%22isEnabled%22%3Atrue%7D' },
  { nombre: 'Cafetería', bim: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/71a33172b0#embed=%7B%22isEnabled%22%3Atrue%7D' },
];

// Nombres que se usaron antes para el mismo edificio del gemelo.
const EDIFICIOS_ALIAS = [
  ['Facultad de Ingeniería Eléctrica', 'Facultad de Eléctrica'],
  ['Facultad de Ingeniería Civil', 'Facultad de Civil'],
];

async function unirEdificio(anterior, actual) {
  const viejo = await bitacoraPool.query('SELECT id FROM campus_buildings WHERE name = $1', [anterior]);
  if (viejo.rows.length === 0) return;
  const nuevo = await bitacoraPool.query('SELECT id FROM campus_buildings WHERE name = $1', [actual]);
  if (nuevo.rows.length === 0) {
    await bitacoraPool.query(
      'UPDATE campus_buildings SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3',
      [actual, slugifySalon(actual), viejo.rows[0].id]
    );
  } else {
    await bitacoraPool.query('UPDATE campus_rooms SET building_id = $1 WHERE building_id = $2', [
      nuevo.rows[0].id,
      viejo.rows[0].id,
    ]);
    await bitacoraPool.query('DELETE FROM campus_buildings WHERE id = $1', [viejo.rows[0].id]);
  }
  await bitacoraPool.query('UPDATE campus_rooms SET building = $1 WHERE building = $2', [actual, anterior]);
}

async function ensureEdificiosTable() {
  if (!bitacoraPool) return;
  try {
    await bitacoraPool.query(`
      CREATE TABLE IF NOT EXISTS campus_buildings (
        id         SERIAL PRIMARY KEY,
        slug       VARCHAR(180) NOT NULL UNIQUE,
        name       VARCHAR(255) NOT NULL UNIQUE,
        levels     INTEGER NOT NULL DEFAULT 1 CHECK (levels > 0),
        photo      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await bitacoraPool.query(`
      ALTER TABLE campus_buildings
      ADD COLUMN IF NOT EXISTS bim_url TEXT
    `);
    await bitacoraPool.query(`
      ALTER TABLE campus_rooms
      ADD COLUMN IF NOT EXISTS building_id INTEGER REFERENCES campus_buildings (id) ON DELETE SET NULL
    `);
    // Los salones guardaban el edificio como texto: se convierten en registros.
    const previos = await bitacoraPool.query(
      `SELECT DISTINCT building FROM campus_rooms
       WHERE building_id IS NULL AND COALESCE(building, '') <> ''`
    );
    for (const fila of previos.rows) {
      await bitacoraPool.query(
        `INSERT INTO campus_buildings (slug, name) VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [slugifySalon(fila.building), fila.building]
      );
    }
    await bitacoraPool.query(`
      UPDATE campus_rooms r
      SET building_id = b.id
      FROM campus_buildings b
      WHERE r.building_id IS NULL AND r.building = b.name
    `);
    for (const [anterior, actual] of EDIFICIOS_ALIAS) {
      await unirEdificio(anterior, actual);
    }
    for (const edificio of EDIFICIOS_GEMELO) {
      await bitacoraPool.query(
        `INSERT INTO campus_buildings (slug, name, bim_url) VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE
         SET bim_url = COALESCE(campus_buildings.bim_url, EXCLUDED.bim_url)`,
        [slugifySalon(edificio.nombre), edificio.nombre, edificio.bim]
      );
    }
    await bitacoraPool.query(`
      CREATE INDEX IF NOT EXISTS idx_campus_rooms_building
      ON campus_rooms (building_id)
    `);
    // Un edificio puede mostrar el modelo 3D que ya está en la librería.
    await bitacoraPool.query(`
      ALTER TABLE campus_buildings
      ADD COLUMN IF NOT EXISTS model_id INTEGER REFERENCES model_library (id) ON DELETE SET NULL
    `);
  } catch (err) {
    console.error('[edificios] No se pudo asegurar la tabla campus_buildings:', err.message);
  }
}

async function ensureSalonesTable() {
  if (!bitacoraPool) return;
  try {
    await bitacoraPool.query(`
      CREATE TABLE IF NOT EXISTS campus_rooms (
        id          SERIAL PRIMARY KEY,
        slug        VARCHAR(180) NOT NULL UNIQUE,
        name        VARCHAR(255) NOT NULL UNIQUE,
        type        VARCHAR(100) NOT NULL,
        building    VARCHAR(255) NOT NULL,
        location    VARCHAR(255) NOT NULL,
        capacity    INTEGER NOT NULL CHECK (capacity > 0),
        description TEXT NOT NULL,
        features    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await bitacoraPool.query(`
      CREATE INDEX IF NOT EXISTS idx_campus_rooms_name
      ON campus_rooms (name)
    `);
    await bitacoraPool.query(`
      ALTER TABLE campus_rooms
      ADD COLUMN IF NOT EXISTS furniture JSONB NOT NULL DEFAULT '[]'::jsonb
    `);
    await bitacoraPool.query(`
      ALTER TABLE campus_rooms
      ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb
    `);
    const existentes = await bitacoraPool.query('SELECT COUNT(*)::int AS total FROM campus_rooms');
    if (existentes.rows[0].total > 0) return;
    await bitacoraPool.query(
      `INSERT INTO campus_rooms (slug, name, type, building, location, capacity, description, features)
       VALUES
         ('lab-sistemas-1', 'Laboratorio de Sistemas 1', 'Laboratorio', 'Facultad de Sistemas', 'Planta baja', 25,
          'Espacio para clases prácticas de programación, redes y desarrollo de software.',
          ARRAY['Computadoras', 'Proyector', 'Aire acondicionado', 'Acceso a internet']),
         ('aula-201', 'Aula 201', 'Aula', 'Edificio Académico', 'Segundo piso', 35,
          'Salón de clases para actividades académicas, presentaciones y trabajo colaborativo.',
          ARRAY['Proyector', 'Pizarra', 'Aire acondicionado', 'Tomas eléctricas']),
         ('lab-electrica', 'Laboratorio de Eléctrica', 'Laboratorio', 'Facultad de Eléctrica', 'Planta baja', 20,
          'Laboratorio equipado para prácticas de circuitos, electrónica y mediciones eléctricas.',
          ARRAY['Mesas de trabajo', 'Equipos de medición', 'Proyector', 'Área de seguridad'])
       ON CONFLICT (slug) DO NOTHING`
    );
  } catch (err) {
    console.error('[salones] No se pudo asegurar la tabla campus_rooms:', err.message);
  }
}

function requireBitacoraAuth(req, res, next) {
  if (!BITACORA_JWT_SECRET) {
    return res.status(503).json({
      ok: false,
      mensaje: 'Autenticación de bitácora no configurada.',
    });
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Token no proporcionado.',
    });
  }
  try {
    const payload = jwt.verify(token, BITACORA_JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Token inválido o expirado.',
    });
  }
}

// Salud general
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Smart Campus API' });
});

// --- Edificios del campus ---

const EDIFICIO_SELECT = `
  SELECT b.id, b.slug, b.name AS nombre, b.levels AS niveles, b.photo AS foto,
         b.bim_url, b.model_id AS modelo_id, m.name AS modelo_nombre, m.file_url AS modelo_url,
         (SELECT COUNT(*) FROM campus_rooms r WHERE r.building_id = b.id)::int AS salones,
         b.created_at, b.updated_at
  FROM campus_buildings b
  LEFT JOIN model_library m ON m.id = b.model_id
`;

function archivoDeFotoEdificio(url) {
  const nombre = path.basename(String(url || '')).replace(/\.(jpe?g|png|gif|webp)$/i, '');
  if (!nombre || !/^[a-zA-Z0-9_-]+$/.test(nombre)) return null;
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.gif']) {
    const archivo = path.join(UPLOADS_EDIFICIOS_DIR, nombre + ext);
    if (fs.existsSync(archivo)) return archivo;
  }
  return null;
}

function parseEdificioPayload(body) {
  const source = body || {};
  const niveles = Number.parseInt(source.niveles, 10);
  const modeloId = Number.parseInt(source.modelo_id, 10);
  const data = {
    nombre: String(source.nombre || '').trim(),
    niveles: Number.isInteger(niveles) ? niveles : NaN,
    modelo_id: Number.isInteger(modeloId) && modeloId > 0 ? modeloId : null,
  };
  const valid = data.nombre && Number.isInteger(data.niveles) && data.niveles > 0 && data.niveles < 100;
  return { data, valid: Boolean(valid) };
}

async function edificioPorId(id) {
  const result = await bitacoraPool.query(`${EDIFICIO_SELECT} WHERE b.id = $1`, [id]);
  return result.rows[0] || null;
}

app.get('/api/edificios/foto/:nombre', (req, res) => {
  const archivo = archivoDeFotoEdificio(req.params.nombre);
  if (!archivo) return res.status(404).end();
  res.sendFile(archivo);
});

app.get('/api/edificios', async (_req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  try {
    const result = await bitacoraPool.query(`${EDIFICIO_SELECT} ORDER BY b.name ASC`);
    res.json({ ok: true, datos: result.rows });
  } catch (err) {
    console.error('Error en GET /api/edificios:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener los edificios.' });
  }
});

app.get('/api/edificios/:slug', async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  try {
    const result = await bitacoraPool.query(`${EDIFICIO_SELECT} WHERE b.slug = $1`, [req.params.slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Edificio no encontrado.' });
    }
    res.json({ ok: true, dato: result.rows[0] });
  } catch (err) {
    console.error('Error en GET /api/edificios/:slug:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener el edificio.' });
  }
});

app.post('/api/edificios', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const { data, valid } = parseEdificioPayload(req.body);
  if (!valid) {
    return res.status(400).json({ ok: false, mensaje: 'Indica el nombre y la cantidad de niveles.' });
  }
  const slug = slugifySalon(data.nombre);
  if (!slug) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre del edificio no es válido.' });
  }
  try {
    const result = await bitacoraPool.query(
      'INSERT INTO campus_buildings (slug, name, levels, model_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [slug, data.nombre, data.niveles, data.modelo_id]
    );
    res.status(201).json({ ok: true, dato: await edificioPorId(result.rows[0].id) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe un edificio con ese nombre.' });
    }
    console.error('Error en POST /api/edificios:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al crear el edificio.' });
  }
});

app.put('/api/edificios/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  const { data, valid } = parseEdificioPayload(req.body);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  if (!valid) {
    return res.status(400).json({ ok: false, mensaje: 'Indica el nombre y la cantidad de niveles.' });
  }
  try {
    const result = await bitacoraPool.query(
      `UPDATE campus_buildings SET name = $1, levels = $2, model_id = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id`,
      [data.nombre, data.niveles, data.modelo_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Edificio no encontrado.' });
    }
    // Los salones muestran el nombre del edificio, así que se actualiza con él.
    await bitacoraPool.query('UPDATE campus_rooms SET building = $1 WHERE building_id = $2', [
      data.nombre,
      id,
    ]);
    res.json({ ok: true, dato: await edificioPorId(id) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe un edificio con ese nombre.' });
    }
    console.error('Error en PUT /api/edificios/:id:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar el edificio.' });
  }
});

app.post('/api/edificios/:id/foto', requireBitacoraAuth, uploadEdificioFoto.single('foto'), async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  if (!req.file) {
    return res.status(400).json({ ok: false, mensaje: 'Selecciona una imagen JPG, PNG, GIF o WebP.' });
  }
  const url = `/api/edificios/foto/${path.basename(req.file.filename, path.extname(req.file.filename))}`;
  try {
    const previo = await bitacoraPool.query('SELECT photo FROM campus_buildings WHERE id = $1', [id]);
    if (previo.rows.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ ok: false, mensaje: 'Edificio no encontrado.' });
    }
    await bitacoraPool.query(
      'UPDATE campus_buildings SET photo = $1, updated_at = NOW() WHERE id = $2',
      [url, id]
    );
    const anterior = archivoDeFotoEdificio(previo.rows[0].photo);
    if (anterior) fs.unlink(anterior, () => {});
    res.status(201).json({ ok: true, dato: await edificioPorId(id) });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('Error en POST /api/edificios/:id/foto:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al guardar la fotografía.' });
  }
});

app.delete('/api/edificios/:id/foto', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  try {
    const result = await bitacoraPool.query(
      'UPDATE campus_buildings SET photo = NULL, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Edificio no encontrado.' });
    }
    const archivo = archivoDeFotoEdificio(String(req.body?.url || ''));
    if (archivo) fs.unlink(archivo, () => {});
    res.json({ ok: true, dato: await edificioPorId(id) });
  } catch (err) {
    console.error('Error en DELETE /api/edificios/:id/foto:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al eliminar la fotografía.' });
  }
});

app.delete('/api/edificios/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  try {
    const salones = await bitacoraPool.query(
      'SELECT COUNT(*)::int AS total FROM campus_rooms WHERE building_id = $1',
      [id]
    );
    if (salones.rows[0].total > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: 'Este edificio todavía tiene salones. Elimínalos primero.',
      });
    }
    const previo = await bitacoraPool.query(
      'DELETE FROM campus_buildings WHERE id = $1 RETURNING photo',
      [id]
    );
    if (previo.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Edificio no encontrado.' });
    }
    const archivo = archivoDeFotoEdificio(previo.rows[0].photo);
    if (archivo) fs.unlink(archivo, () => {});
    res.json({ ok: true, mensaje: 'Edificio eliminado correctamente.' });
  } catch (err) {
    console.error('Error en DELETE /api/edificios/:id:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al eliminar el edificio.' });
  }
});

// --- Salones del campus ---

const SALON_SELECT = `
  SELECT r.id, r.slug, r.name AS nombre, r.type AS tipo,
         COALESCE(b.name, r.building) AS edificio, r.building_id AS edificio_id,
         r.location AS ubicacion, r.capacity AS capacidad, r.description AS descripcion,
         r.features AS caracteristicas, r.furniture AS mobiliario, r.photos AS fotos,
         r.created_at, r.updated_at
  FROM campus_rooms r
  LEFT JOIN campus_buildings b ON b.id = r.building_id
`;

function parseMobiliario(value) {
  if (!Array.isArray(value)) return [];
  const items = [];
  const series = new Set();
  for (const item of value) {
    const nombre = String(item?.nombre || '').trim();
    const serie = String(item?.serie || '').trim();
    const cantidad = Number.parseInt(item?.cantidad, 10);
    if (!nombre || !serie || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) continue;
    const clave = serie.toLowerCase();
    if (series.has(clave)) continue;
    series.add(clave);
    items.push({ nombre, cantidad, serie });
  }
  return items;
}

function slugifySalon(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

function parseSalonPayload(body) {
  const source = body || {};
  const capacidad = Number.parseInt(source.capacidad, 10);
  const caracteristicas = Array.isArray(source.caracteristicas)
    ? source.caracteristicas.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const edificioId = Number.parseInt(source.edificio_id, 10);
  const data = {
    nombre: String(source.nombre || '').trim(),
    tipo: String(source.tipo || '').trim(),
    edificio: String(source.edificio || '').trim(),
    edificio_id: Number.isInteger(edificioId) && edificioId > 0 ? edificioId : null,
    ubicacion: String(source.ubicacion || '').trim(),
    capacidad,
    descripcion: String(source.descripcion || '').trim(),
    caracteristicas,
  };
  const valid =
    data.nombre &&
    data.tipo &&
    (data.edificio_id || data.edificio) &&
    Number.isInteger(data.capacidad) &&
    data.capacidad > 0 &&
    data.descripcion;
  return { data, valid: Boolean(valid) };
}

function presentSalon(row) {
  if (!row || typeof row !== 'object') return row;
  const fotos = Array.isArray(row.fotos)
    ? row.fotos.map((url) => {
        if (typeof url !== 'string') return url;
        const nombre = path.basename(url).replace(/\.(jpe?g|png|gif|webp)$/i, '');
        return nombre ? `/api/salones/foto/${nombre}` : url;
      })
    : [];
  return { ...row, fotos };
}

function archivoDeFotoSalon(url) {
  const nombre = path.basename(String(url || '')).replace(/\.(jpe?g|png|gif|webp)$/i, '');
  if (!nombre || !/^[a-zA-Z0-9_-]+$/.test(nombre)) return null;
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.gif']) {
    const archivo = path.join(UPLOADS_SALONES_DIR, nombre + ext);
    if (fs.existsSync(archivo)) return archivo;
  }
  return null;
}

async function salonPorId(id) {
  const result = await bitacoraPool.query(`${SALON_SELECT} WHERE r.id = $1`, [id]);
  return result.rows.length ? presentSalon(result.rows[0]) : null;
}

// El salón guarda el edificio enlazado y también su nombre, para las vistas que solo muestran texto.
async function resolverEdificio(data) {
  if (data.edificio_id) {
    const result = await bitacoraPool.query('SELECT id, name FROM campus_buildings WHERE id = $1', [
      data.edificio_id,
    ]);
    if (result.rows.length === 0) return null;
    return { id: result.rows[0].id, nombre: result.rows[0].name };
  }
  const result = await bitacoraPool.query('SELECT id, name FROM campus_buildings WHERE name = $1', [
    data.edificio,
  ]);
  if (result.rows.length) return { id: result.rows[0].id, nombre: result.rows[0].name };
  return { id: null, nombre: data.edificio };
}

app.get('/api/salones/foto/:nombre', (req, res) => {
  const archivo = archivoDeFotoSalon(req.params.nombre);
  if (!archivo) return res.status(404).end();
  res.sendFile(archivo);
});

app.get('/api/salones', async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const edificioId = Number.parseInt(req.query.edificio_id, 10);
  try {
    const result = Number.isInteger(edificioId)
      ? await bitacoraPool.query(`${SALON_SELECT} WHERE r.building_id = $1 ORDER BY r.name ASC`, [
          edificioId,
        ])
      : await bitacoraPool.query(`${SALON_SELECT} ORDER BY r.name ASC`);
    res.json({ ok: true, datos: result.rows.map(presentSalon) });
  } catch (err) {
    console.error('Error en GET /api/salones:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener los salones.' });
  }
});

app.get('/api/salones/:slug', async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  try {
    const result = await bitacoraPool.query(`${SALON_SELECT} WHERE r.slug = $1`, [req.params.slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Salón no encontrado.' });
    }
    res.json({ ok: true, dato: presentSalon(result.rows[0]) });
  } catch (err) {
    console.error('Error en GET /api/salones/:slug:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener el salón.' });
  }
});

app.post('/api/salones', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const { data, valid } = parseSalonPayload(req.body);
  if (!valid) {
    return res.status(400).json({ ok: false, mensaje: 'Completa todos los campos requeridos del salón.' });
  }
  const slug = slugifySalon(data.nombre);
  if (!slug) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre del salón no es válido.' });
  }
  try {
    const edificio = await resolverEdificio(data);
    if (!edificio) {
      return res.status(400).json({ ok: false, mensaje: 'El edificio indicado no existe.' });
    }
    const result = await bitacoraPool.query(
      `INSERT INTO campus_rooms (slug, name, type, building, building_id, location, capacity, description, features)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [slug, data.nombre, data.tipo, edificio.nombre, edificio.id, data.ubicacion, data.capacidad, data.descripcion, data.caracteristicas]
    );
    res.status(201).json({ ok: true, dato: await salonPorId(result.rows[0].id) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe un salón con ese nombre.' });
    }
    console.error('Error en POST /api/salones:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al crear el salón.' });
  }
});

app.put('/api/salones/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  const { data, valid } = parseSalonPayload(req.body);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  if (!valid) {
    return res.status(400).json({ ok: false, mensaje: 'Completa todos los campos requeridos del salón.' });
  }
  try {
    const edificio = await resolverEdificio(data);
    if (!edificio) {
      return res.status(400).json({ ok: false, mensaje: 'El edificio indicado no existe.' });
    }
    const result = await bitacoraPool.query(
      `UPDATE campus_rooms
       SET name = $1, type = $2, building = $3, building_id = $4, location = $5, capacity = $6,
           description = $7, features = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING id`,
      [data.nombre, data.tipo, edificio.nombre, edificio.id, data.ubicacion, data.capacidad, data.descripcion, data.caracteristicas, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Salón no encontrado.' });
    }
    res.json({ ok: true, dato: await salonPorId(id) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe un salón con ese nombre.' });
    }
    console.error('Error en PUT /api/salones/:id:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar el salón.' });
  }
});

app.put('/api/salones/:id/mobiliario', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  const mobiliario = parseMobiliario(req.body?.mobiliario);
  try {
    const result = await bitacoraPool.query(
      `UPDATE campus_rooms
       SET furniture = $1::jsonb, updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [JSON.stringify(mobiliario), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Salón no encontrado.' });
    }
    res.json({ ok: true, dato: await salonPorId(id) });
  } catch (err) {
    console.error('Error en PUT /api/salones/:id/mobiliario:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al guardar el mobiliario.' });
  }
});

const SALON_RETURNING = 'RETURNING id';

app.post('/api/salones/:id/fotos', requireBitacoraAuth, uploadSalonFoto.single('foto'), async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  if (!req.file) {
    return res.status(400).json({ ok: false, mensaje: 'Selecciona una imagen JPG, PNG, GIF o WebP.' });
  }
  const nombre = path.basename(req.file.filename, path.extname(req.file.filename));
  const url = `/api/salones/foto/${nombre}`;
  try {
    const result = await bitacoraPool.query(
      `UPDATE campus_rooms
       SET photos = COALESCE(photos, '[]'::jsonb) || $1::jsonb, updated_at = NOW()
       WHERE id = $2
       ${SALON_RETURNING}`,
      [JSON.stringify([url]), id]
    );
    if (result.rows.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ ok: false, mensaje: 'Salón no encontrado.' });
    }
    res.status(201).json({ ok: true, dato: await salonPorId(id) });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('Error en POST /api/salones/:id/fotos:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al subir la fotografía.' });
  }
});

app.delete('/api/salones/:id/fotos', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  const url = String(req.body?.url || '');
  const nombre = path.basename(url).replace(/\.(jpe?g|png|gif|webp)$/i, '');
  if (!Number.isInteger(id) || id <= 0 || !/^[a-zA-Z0-9_-]+$/.test(nombre)) {
    return res.status(400).json({ ok: false, mensaje: 'No se pudo identificar la fotografía.' });
  }
  try {
    const result = await bitacoraPool.query(
      `UPDATE campus_rooms
       SET photos = COALESCE((
         SELECT jsonb_agg(item)
         FROM jsonb_array_elements(COALESCE(photos, '[]'::jsonb)) item
         WHERE regexp_replace(item #>> '{}', '^.*/|\\.(jpe?g|png|gif|webp)$', '', 'gi') <> $1
       ), '[]'::jsonb), updated_at = NOW()
       WHERE id = $2
       ${SALON_RETURNING}`,
      [nombre, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Salón no encontrado.' });
    }
    const archivo = archivoDeFotoSalon(nombre);
    if (archivo) fs.unlinkSync(archivo);
    res.json({ ok: true, dato: await salonPorId(id) });
  } catch (err) {
    console.error('Error en DELETE /api/salones/:id/fotos:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al eliminar la fotografía.' });
  }
});

app.delete('/api/salones/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  try {
    const result = await bitacoraPool.query('DELETE FROM campus_rooms WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Salón no encontrado.' });
    }
    res.json({ ok: true, mensaje: 'Salón eliminado correctamente.' });
  } catch (err) {
    console.error('Error en DELETE /api/salones/:id:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al eliminar el salón.' });
  }
});

// --- Bitácora de proyecto ---

// --- Eventos ---

app.get('/api/eventos', async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  try {
    const result = await bitacoraPool.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.location,
        e.author,
        e.created_at,
        COALESCE(
          (
            SELECT array_agg(img.image_url ORDER BY img.sort_order)
            FROM project_event_images img
            WHERE img.event_id = e.id
          ),
          ARRAY[]::text[]
        ) AS images
      FROM project_events e
      ORDER BY event_date DESC
      LIMIT $1
    `,
      [limit]
    );
    res.json({ ok: true, datos: withAbsoluteEventImagesList(result.rows) });
  } catch (err) {
    console.error('Error en GET /api/eventos:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener los eventos.',
    });
  }
});

app.get('/api/eventos/:id', async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'ID inválido.',
    });
  }
  try {
    const result = await bitacoraPool.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.location,
        e.author,
        e.created_at,
        COALESCE(
          (
            SELECT array_agg(img.image_url ORDER BY img.sort_order)
            FROM project_event_images img
            WHERE img.event_id = e.id
          ),
          ARRAY[]::text[]
        ) AS images
      FROM project_events e
      WHERE e.id = $1
    `,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Evento no encontrado.',
      });
    }
    res.json({ ok: true, dato: withAbsoluteEventImages(result.rows[0]) });
  } catch (err) {
    console.error('Error en GET /api/eventos/:id:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el evento.',
    });
  }
});

app.post('/api/eventos', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const { title, description, event_date, location, author } = req.body || {};
  if (!title || !description || !event_date || !location || !author) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Faltan campos requeridos: title, description, event_date, location, author.',
    });
  }
  const date = new Date(event_date);
  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({
      ok: false,
      mensaje: 'event_date inválido.',
    });
  }
  try {
    const result = await bitacoraPool.query(
      `
      INSERT INTO project_events (title, description, event_date, location, author)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, description, event_date, location, author, created_at
    `,
      [String(title).trim(), String(description).trim(), date.toISOString(), String(location).trim(), String(author).trim()]
    );
    res.status(201).json({ ok: true, dato: result.rows[0] });
  } catch (err) {
    console.error('Error en POST /api/eventos:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al crear el evento.',
    });
  }
});

app.put('/api/eventos/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  const { title, description, event_date, location, author } = req.body || {};
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  if (!title || !description || !event_date || !location || !author) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Faltan campos requeridos: title, description, event_date, location, author.',
    });
  }
  const date = new Date(event_date);
  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({
      ok: false,
      mensaje: 'event_date inválido.',
    });
  }
  try {
    const result = await bitacoraPool.query(
      `
      UPDATE project_events
      SET title = $1, description = $2, event_date = $3, location = $4, author = $5
      WHERE id = $6
      RETURNING id, title, description, event_date, location, author, created_at
    `,
      [String(title).trim(), String(description).trim(), date.toISOString(), String(location).trim(), String(author).trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Evento no encontrado.',
      });
    }
    res.json({ ok: true, dato: result.rows[0] });
  } catch (err) {
    console.error('Error en PUT /api/eventos/:id:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar el evento.',
    });
  }
});

app.delete('/api/eventos/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  try {
    // Borrar archivos físicos asociados
    const prev = await bitacoraPool.query(
      'SELECT image_url FROM project_event_images WHERE event_id = $1 ORDER BY sort_order',
      [id]
    );
    for (const row of prev.rows) {
      const url = row.image_url;
      if (typeof url === 'string') {
        const filename = path.basename(url);
        const filePath = path.join(UPLOADS_EVENTOS_DIR, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    await bitacoraPool.query('DELETE FROM project_event_images WHERE event_id = $1', [id]);
    const result = await bitacoraPool.query('DELETE FROM project_events WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Evento no encontrado.',
      });
    }
    res.json({ ok: true, mensaje: 'Evento eliminado correctamente.' });
  } catch (err) {
    console.error('Error en DELETE /api/eventos/:id:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar el evento.',
    });
  }
});

// Quitar todas las imágenes del evento (sin borrar el evento)
app.delete('/api/eventos/:id/images', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }

  try {
    const prev = await bitacoraPool.query(
      'SELECT image_url FROM project_event_images WHERE event_id = $1 ORDER BY sort_order',
      [id]
    );
    for (const row of prev.rows) {
      const url = row.image_url;
      if (typeof url === 'string') {
        const filename = path.basename(url);
        const filePath = path.join(UPLOADS_EVENTOS_DIR, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    await bitacoraPool.query('DELETE FROM project_event_images WHERE event_id = $1', [id]);
    res.json({ ok: true, mensaje: 'Imágenes del evento eliminadas correctamente.' });
  } catch (err) {
    console.error('Error en DELETE /api/eventos/:id/images:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar las imágenes del evento.',
    });
  }
});

// Reemplazar imágenes del evento (1 a 5)
app.put('/api/eventos/:id/images', requireBitacoraAuth, uploadEventos.array('images', 5), async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ ok: false, mensaje: 'Debes enviar al menos 1 imagen (campo \"images\").' });
  }

  try {
    // Borrar imágenes previas (archivos y filas)
    const prev = await bitacoraPool.query(
      'SELECT image_url FROM project_event_images WHERE event_id = $1 ORDER BY sort_order',
      [id]
    );
    for (const row of prev.rows) {
      const url = row.image_url;
      if (typeof url === 'string') {
        const filename = path.basename(url);
        const filePath = path.join(UPLOADS_EVENTOS_DIR, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    await bitacoraPool.query('DELETE FROM project_event_images WHERE event_id = $1', [id]);

    // Insertar nuevas filas
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = `/api/eventos/uploads/${file.filename}`;
      await bitacoraPool.query(
        'INSERT INTO project_event_images (event_id, image_url, sort_order) VALUES ($1, $2, $3)',
        [id, relativePath, i]
      );
    }

    res.json({ ok: true, mensaje: 'Imágenes del evento actualizadas.' });
  } catch (err) {
    console.error('Error en PUT /api/eventos/:id/images:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar las imágenes del evento.',
    });
  }
});

// Login admin para dashboard de bitácora
app.post('/api/bitacora/login', (req, res) => {
  const { usuario, password } = req.body || {};

  if (!BITACORA_JWT_SECRET || !hasAnyAdmin) {
    return res.status(503).json({
      ok: false,
      mensaje: 'Login de bitácora no está configurado en el servidor.',
    });
  }

  if (!usuario || !password) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Usuario y contraseña son requeridos.',
    });
  }

  const userTrim = String(usuario).trim();
  const passTrim = String(password).trim();
  const valid = BITACORA_ADMIN_LIST.some(
    (c) => userTrim === c.user && passTrim === c.password
  );
  if (!valid) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Credenciales inválidas.',
    });
  }

  const token = jwt.sign(
    {
      sub: usuario,
      rol: 'admin',
      scope: 'bitacora',
    },
    BITACORA_JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    ok: true,
    token,
  });
});

// Listar logs (solo lectura)
app.get('/api/bitacora/logs', async (req, res) => {
  if (!ensureBitacoraConfig(res)) return;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const status = req.query.status;

  try {
    const params = [];
    let where = '';
    if (status && BITACORA_STATUS.includes(status)) {
      where = 'WHERE status_tags = $1';
      params.push(status);
    }

    const result = await bitacoraPool.query(
      `
      SELECT id, title, description, status_tags, author, created_at, cover_image
      FROM project_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
    `,
      [...params, limit]
    );

    res.json({
      ok: true,
      datos: withAbsoluteCoverList(result.rows),
    });
  } catch (err) {
    console.error('Error en GET /api/bitacora/logs:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener los registros de bitácora.',
    });
  }
});

// Obtener un log por id
app.get('/api/bitacora/logs/:id', async (req, res) => {
  if (!ensureBitacoraConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'ID inválido.',
    });
  }

  try {
    const result = await bitacoraPool.query(
      `
      SELECT id, title, description, status_tags, author, created_at, cover_image
      FROM project_logs
      WHERE id = $1
    `,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Registro no encontrado.',
      });
    }
    res.json({
      ok: true,
      dato: withAbsoluteCover(result.rows[0]),
    });
  } catch (err) {
    console.error('Error en GET /api/bitacora/logs/:id:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el registro de bitácora.',
    });
  }
});

// Crear un nuevo log (protegido)
app.post('/api/bitacora/logs', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraConfig(res)) return;
  const { title, description, status_tags, author } = req.body || {};

  if (!title || !description || !status_tags || !author) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Faltan campos requeridos: title, description, status_tags, author.',
    });
  }

  if (!BITACORA_STATUS.includes(status_tags)) {
    return res.status(400).json({
      ok: false,
      mensaje: `status_tags debe ser uno de: ${BITACORA_STATUS.join(', ')}`,
    });
  }

  try {
    const result = await bitacoraPool.query(
      `
      INSERT INTO project_logs (title, description, status_tags, author)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, description, status_tags, author, created_at, cover_image
    `,
      [String(title).trim(), String(description).trim(), status_tags, String(author).trim()]
    );
    res.status(201).json({
      ok: true,
      dato: withAbsoluteCover(result.rows[0]),
    });
  } catch (err) {
    console.error('Error en POST /api/bitacora/logs:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al crear el registro de bitácora.',
    });
  }
});

// Actualizar un log (protegido)
app.put('/api/bitacora/logs/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  const { title, description, status_tags, author } = req.body || {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'ID inválido.',
    });
  }

  if (!title || !description || !status_tags || !author) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Faltan campos requeridos: title, description, status_tags, author.',
    });
  }

  if (!BITACORA_STATUS.includes(status_tags)) {
    return res.status(400).json({
      ok: false,
      mensaje: `status_tags debe ser uno de: ${BITACORA_STATUS.join(', ')}`,
    });
  }

  try {
    const result = await bitacoraPool.query(
      `
      UPDATE project_logs
      SET title = $1,
          description = $2,
          status_tags = $3,
          author = $4
      WHERE id = $5
      RETURNING id, title, description, status_tags, author, created_at, cover_image
    `,
      [String(title).trim(), String(description).trim(), status_tags, String(author).trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Registro no encontrado.',
      });
    }

    res.json({
      ok: true,
      dato: withAbsoluteCover(result.rows[0]),
    });
  } catch (err) {
    console.error('Error en PUT /api/bitacora/logs/:id:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar el registro de bitácora.',
    });
  }
});

// Subir o reemplazar imagen de portada (protegido)
app.put(
  '/api/bitacora/logs/:id/cover',
  requireBitacoraAuth,
  (req, res, next) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
    }
    next();
  },
  uploadBitacora.single('cover'),
  async (req, res) => {
    if (!ensureBitacoraConfig(res)) return;
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debes enviar un archivo de imagen (campo "cover"). Formatos: JPEG, PNG, GIF, WebP. Máx. 5 MB.',
      });
    }
    const id = Number.parseInt(req.params.id, 10);
    const relativePath = `/api/bitacora/uploads/${req.file.filename}`;

    try {
      const prev = await bitacoraPool.query(
        'SELECT cover_image FROM project_logs WHERE id = $1',
        [id]
      );
      if (prev.rows.length === 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado.' });
      }
      const oldPath = prev.rows[0].cover_image;
      if (oldPath) {
        const oldFile = path.join(UPLOADS_BITACORA_DIR, path.basename(oldPath));
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      await bitacoraPool.query(
        'UPDATE project_logs SET cover_image = $1 WHERE id = $2',
        [relativePath, id]
      );
      const result = await bitacoraPool.query(
        'SELECT id, title, description, status_tags, author, created_at, cover_image FROM project_logs WHERE id = $1',
        [id]
      );
      res.json({ ok: true, dato: withAbsoluteCover(result.rows[0]) });
    } catch (err) {
      fs.unlink(req.file.path, () => {});
      console.error('Error en PUT /api/bitacora/logs/:id/cover:', err);
      res.status(500).json({
        ok: false,
        mensaje: 'Error al guardar la imagen de portada.',
      });
    }
  }
);

// Quitar imagen de portada (protegido)
app.delete('/api/bitacora/logs/:id/cover', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  try {
    const result = await bitacoraPool.query(
      'SELECT cover_image FROM project_logs WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado.' });
    }
    const cover = result.rows[0].cover_image;
    if (cover) {
      const filePath = path.join(UPLOADS_BITACORA_DIR, path.basename(cover));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await bitacoraPool.query('UPDATE project_logs SET cover_image = NULL WHERE id = $1', [id]);
    }
    const updated = await bitacoraPool.query(
      'SELECT id, title, description, status_tags, author, created_at, cover_image FROM project_logs WHERE id = $1',
      [id]
    );
    res.json({ ok: true, dato: withAbsoluteCover(updated.rows[0]) });
  } catch (err) {
    console.error('Error en DELETE /api/bitacora/logs/:id/cover:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al quitar la imagen de portada.',
    });
  }
});

// Eliminar un log (protegido)
app.delete('/api/bitacora/logs/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'ID inválido.',
    });
  }

  try {
    const row = await bitacoraPool.query('SELECT cover_image FROM project_logs WHERE id = $1', [id]);
    if (row.rows.length > 0 && row.rows[0].cover_image) {
      const filePath = path.join(UPLOADS_BITACORA_DIR, path.basename(row.rows[0].cover_image));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const result = await bitacoraPool.query('DELETE FROM project_logs WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Registro no encontrado.',
      });
    }
    res.json({
      ok: true,
      mensaje: 'Registro eliminado correctamente.',
    });
  } catch (err) {
    console.error('Error en DELETE /api/bitacora/logs/:id:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar el registro de bitácora.',
    });
  }
});

// --- Librería de Modelos 3D ---

/** Acepta reference_code, referenceCode o referencecode (body JSON o multipart). */
function parseModelReferenceCode(body) {
  if (!body || typeof body !== 'object') return null;
  const raw = body.reference_code ?? body.referenceCode ?? body.referencecode;
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, 100);
  return s || null;
}

app.get('/api/modelos3d', async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const category = req.query.category;
  try {
    const params = [];
    let where = '';
    if (category && typeof category === 'string' && category.trim()) {
      where = 'WHERE category = $1';
      params.push(category.trim());
    }
    const result = await bitacoraPool.query(
      `SELECT id, name, category, reference_code, description, file_url, file_size, author, created_at
       FROM model_library ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );
    res.json({ ok: true, datos: result.rows });
  } catch (err) {
    console.error('Error en GET /api/modelos3d:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener los modelos 3D.' });
  }
});

app.get('/api/modelos3d/categorias', async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  try {
    const result = await bitacoraPool.query(
      `SELECT DISTINCT category FROM model_library ORDER BY category`
    );
    const categorias = result.rows.map((r) => r.category);
    res.json({ ok: true, datos: categorias });
  } catch (err) {
    console.error('Error en GET /api/modelos3d/categorias:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener las categorías.' });
  }
});

app.get('/api/modelos3d/:id', async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  try {
    const result = await bitacoraPool.query(
      `SELECT id, name, category, reference_code, description, file_url, file_size, author, created_at
       FROM model_library WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Modelo no encontrado.' });
    }
    res.json({ ok: true, dato: result.rows[0] });
  } catch (err) {
    console.error('Error en GET /api/modelos3d/:id:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener el modelo.' });
  }
});

app.post('/api/modelos3d', requireBitacoraAuth, uploadModelo3d.single('file'), async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  if (!req.file) {
    return res.status(400).json({ ok: false, mensaje: 'Debes enviar un archivo .glb (campo "file").' });
  }
  const body = req.body || {};
  const { name, category, description, author } = body;
  if (!name || !category || !author) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ ok: false, mensaje: 'Faltan campos requeridos: name, category, author.' });
  }
  const refCode = parseModelReferenceCode(body);
  if (!refCode) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ ok: false, mensaje: 'El código de referencia es obligatorio.' });
  }
  const relativePath = `/api/modelos3d/uploads/${req.file.filename}`;
  try {
    const result = await bitacoraPool.query(
      `INSERT INTO model_library (name, category, reference_code, description, file_url, file_size, author)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, category, reference_code, description, file_url, file_size, author, created_at`,
      [
        String(name).trim(),
        String(category).trim(),
        refCode,
        description ? String(description).trim() : null,
        relativePath,
        req.file.size,
        String(author).trim(),
      ]
    );
    res.status(201).json({ ok: true, dato: result.rows[0] });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('Error en POST /api/modelos3d:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al crear el modelo.' });
  }
});

app.put('/api/modelos3d/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  const body = req.body || {};
  const { name, category, description, author } = body;
  if (!name || !category || !author) {
    return res.status(400).json({ ok: false, mensaje: 'Faltan campos requeridos: name, category, author.' });
  }
  const refCode = parseModelReferenceCode(body);
  if (!refCode) {
    return res.status(400).json({ ok: false, mensaje: 'El código de referencia es obligatorio.' });
  }
  try {
    const result = await bitacoraPool.query(
      `UPDATE model_library
       SET name = $1, category = $2, reference_code = $3, description = $4, author = $5
       WHERE id = $6
       RETURNING id, name, category, reference_code, description, file_url, file_size, author, created_at`,
      [
        String(name).trim(),
        String(category).trim(),
        refCode,
        description ? String(description).trim() : null,
        String(author).trim(),
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Modelo no encontrado.' });
    }
    res.json({ ok: true, dato: result.rows[0] });
  } catch (err) {
    console.error('Error en PUT /api/modelos3d/:id:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar el modelo.' });
  }
});

app.put('/api/modelos3d/:id/file', requireBitacoraAuth, uploadModelo3d.single('file'), async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  if (!req.file) {
    return res.status(400).json({ ok: false, mensaje: 'Debes enviar un archivo .glb (campo "file").' });
  }
  try {
    const prev = await bitacoraPool.query('SELECT file_url FROM model_library WHERE id = $1', [id]);
    if (prev.rows.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ ok: false, mensaje: 'Modelo no encontrado.' });
    }
    const oldUrl = prev.rows[0].file_url;
    if (oldUrl) {
      const oldFile = path.join(UPLOADS_MODELOS3D_DIR, path.basename(oldUrl));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
    const relativePath = `/api/modelos3d/uploads/${req.file.filename}`;
    const result = await bitacoraPool.query(
      `UPDATE model_library SET file_url = $1, file_size = $2 WHERE id = $3
       RETURNING id, name, category, reference_code, description, file_url, file_size, author, created_at`,
      [relativePath, req.file.size, id]
    );
    res.json({ ok: true, dato: result.rows[0] });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('Error en PUT /api/modelos3d/:id/file:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al reemplazar el archivo del modelo.' });
  }
});

app.delete('/api/modelos3d/:id', requireBitacoraAuth, async (req, res) => {
  if (!ensureBitacoraDbConfig(res)) return;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
  }
  try {
    const prev = await bitacoraPool.query('SELECT file_url FROM model_library WHERE id = $1', [id]);
    if (prev.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Modelo no encontrado.' });
    }
    const fileUrl = prev.rows[0].file_url;
    if (fileUrl) {
      const filePath = path.join(UPLOADS_MODELOS3D_DIR, path.basename(fileUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await bitacoraPool.query('DELETE FROM model_library WHERE id = $1', [id]);
    res.json({ ok: true, mensaje: 'Modelo eliminado correctamente.' });
  } catch (err) {
    console.error('Error en DELETE /api/modelos3d/:id:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al eliminar el modelo.' });
  }
});

// Registro de interesados desde la landing
app.post('/api/registro', async (req, res) => {
  const { nombre, correo, rol } = req.body || {};

  if (!nombre || !correo || !rol) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Faltan campos requeridos: nombre, correo, rol.',
    });
  }

  const correoStr = String(correo).trim().toLowerCase();
  if (!correoStr.endsWith('@utp.ac.pa')) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El correo debe ser institucional (@utp.ac.pa).',
    });
  }

  try {
    await pool.query(
      `INSERT INTO interesados (nombre, correo, rol, creado_en)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (correo) DO UPDATE SET nombre = $1, rol = $3, actualizado_en = NOW()`,
      [String(nombre).trim(), correoStr, String(rol).trim()]
    );
    res.status(201).json({
      ok: true,
      mensaje: 'Registro recibido correctamente.',
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({
        ok: false,
        mensaje: 'Servicio en configuración. Por favor intenta más tarde.',
      });
    }
    console.error('Error en /api/registro:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al guardar el registro. Intenta de nuevo.',
    });
  }
});

// Ruta base informativa para evitar "Cannot GET /" cuando se accede directo al puerto de la API
app.get('/', (_req, res) => {
  res.send('API Smart Campus en funcionamiento');
});

ensureEventosTable();
// Los edificios se apoyan en las tablas de salones y de modelos 3D, así que van al final.
ensureModelLibraryTable()
  .then(ensureSalonesTable)
  .then(ensureEdificiosTable);

app.listen(PORT, () => {
  console.log(`API Smart Campus escuchando en http://localhost:${PORT}`);
});
