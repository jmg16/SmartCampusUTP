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
const UPLOADS_EVENTOS_DIR = path.join(__dirname, 'uploads', 'eventos');
if (!fs.existsSync(UPLOADS_EVENTOS_DIR)) {
  fs.mkdirSync(UPLOADS_EVENTOS_DIR, { recursive: true });
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

const uploadEventos = multer({
  storage: storageEventos,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
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
  // Importante:
  // Para evitar problemas de DNS/host desde `localhost` o redes distintas,
  // devolvemos las URLs como relativas tal como se guardan en BD:
  //   /api/eventos/uploads/...
  // De esta forma cargan vía Nginx/proxy/túnel al backend.
  return { ...event, images: event.images };
}

function withAbsoluteEventImagesList(rows) {
  return Array.isArray(rows) ? rows.map(withAbsoluteEventImages) : rows;
}

app.use(cors({ origin: true }));
app.use(express.json());
// Servir imágenes de portada de bitácora (URL pública para el front)
app.use('/api/bitacora/uploads', express.static(UPLOADS_BITACORA_DIR));

// Servir imágenes de eventos (URL pública para el front)
app.use('/api/eventos/uploads', express.static(UPLOADS_EVENTOS_DIR));

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

app.listen(PORT, () => {
  console.log(`API Smart Campus escuchando en http://localhost:${PORT}`);
});
