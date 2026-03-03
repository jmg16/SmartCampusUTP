const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/smartcampus',
  max: 10,
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Smart Campus API' });
});

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

app.listen(PORT, () => {
  console.log(`API Smart Campus escuchando en http://localhost:${PORT}`);
});
