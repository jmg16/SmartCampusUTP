const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

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

if (!BITACORA_JWT_SECRET || !BITACORA_ADMIN_USER || !BITACORA_ADMIN_PASSWORD) {
  console.warn(
    '[bitacora] Faltan variables de entorno BITACORA_JWT_SECRET, BITACORA_ADMIN_USER o BITACORA_ADMIN_PASSWORD. Login y endpoints protegidos devolverán 503 hasta configurarlas.'
  );
}

const BITACORA_STATUS = ['En progreso', 'Completado', 'Bloqueado'];

function ensureBitacoraConfig(res) {
  if (!bitacoraPool || !BITACORA_JWT_SECRET || !BITACORA_ADMIN_USER || !BITACORA_ADMIN_PASSWORD) {
    res.status(503).json({
      ok: false,
      mensaje: 'Servicio de bitácora no está configurado en el servidor.',
    });
    return false;
  }
  return true;
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

// Login admin para dashboard de bitácora
app.post('/api/bitacora/login', (req, res) => {
  const { usuario, password } = req.body || {};

  if (!BITACORA_JWT_SECRET || !BITACORA_ADMIN_USER || !BITACORA_ADMIN_PASSWORD) {
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

  if (usuario !== BITACORA_ADMIN_USER || password !== BITACORA_ADMIN_PASSWORD) {
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
      SELECT id, title, description, status_tags, author, created_at
      FROM project_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
    `,
      [...params, limit]
    );

    res.json({
      ok: true,
      datos: result.rows,
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
      SELECT id, title, description, status_tags, author, created_at
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
      dato: result.rows[0],
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
      RETURNING id, title, description, status_tags, author, created_at
    `,
      [String(title).trim(), String(description).trim(), status_tags, String(author).trim()]
    );
    res.status(201).json({
      ok: true,
      dato: result.rows[0],
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
      RETURNING id, title, description, status_tags, author, created_at
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
      dato: result.rows[0],
    });
  } catch (err) {
    console.error('Error en PUT /api/bitacora/logs/:id:', err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar el registro de bitácora.',
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

app.listen(PORT, () => {
  console.log(`API Smart Campus escuchando en http://localhost:${PORT}`);
});
