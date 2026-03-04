#!/usr/bin/env node
/**
 * Verificar conectividad a la BD de bitácora (10.192.64.250:5432).
 * Ejecutar desde el servidor de la app (smartcampusch):
 *
 *   cd server && node scripts/verificar-conexion-bitacora.js
 *
 * Con variables cargadas (para probar conexión real con pg):
 *   set -a && source .env.bitacora && set +a && node scripts/verificar-conexion-bitacora.js
 */

const net = require('net');

const HOST = process.env.BITACORA_DB_HOST || '10.192.64.250';
const PORT = parseInt(process.env.BITACORA_DB_PORT || '5432', 10);

function checkTcp() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: HOST, port: PORT }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('Timeout 5s'));
    });
    socket.on('error', reject);
  });
}

async function checkPg() {
  const url = process.env.BITACORA_DATABASE_URL;
  if (!url) return null;
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const r = await pool.query('SELECT 1 AS ok');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'project_logs'
      ) AS exists
    `);
    await pool.end();
    return { ok: r.rows[0].ok === 1, tableExists: tableCheck.rows[0].exists };
  } catch (err) {
    await pool.end().catch(() => {});
    throw err;
  }
}

async function main() {
  console.log('Verificando conexión a BD bitácora');
  console.log('  Host:', HOST, '| Puerto:', PORT);
  console.log('');

  try {
    await checkTcp();
    console.log('  TCP:', HOST + ':' + PORT, '-> OK (puerto alcanzable)');
  } catch (err) {
    console.error('  TCP: FALLO -', err.message);
    console.error('');
    console.error('Comprueba: firewall, que PostgreSQL escuche en', HOST + ':' + PORT + ', y que el servidor de la app pueda llegar a esa IP.');
    process.exit(1);
  }

  if (process.env.BITACORA_DATABASE_URL) {
    try {
      const r = await checkPg();
      console.log('  PostgreSQL (BITACORA_DATABASE_URL): OK');
      console.log('  Tabla project_logs existe:', r.tableExists ? 'Sí' : 'No');
      if (!r.tableExists) {
        console.log('');
        console.log('Ejecuta el script de inicialización:');
        console.log('  PGPASSWORD=... psql -h', HOST, '-p', PORT, '-U bitacora_admin -d bitacora_db -f scripts/init-bitacora.sql');
      }
    } catch (err) {
      console.error('  PostgreSQL: FALLO -', err.message);
      process.exit(1);
    }
  } else {
    console.log('  PostgreSQL: no comprobado (falta BITACORA_DATABASE_URL)');
  }

  console.log('');
  console.log('Listo.');
}

main();
