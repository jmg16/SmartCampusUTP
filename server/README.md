# API Smart Campus UTP Chiriquí

Backend Node.js + Express para la landing. Nginx actuará como proxy inverso en producción.

## Endpoints

- `GET /api/health` — Estado del servicio
- `POST /api/registro` — Registro de interesados (nombre, correo @utp.ac.pa, rol)

## Base de datos (PostgreSQL)

Crear la base y la tabla:

```bash
createdb smartcampus
psql -d smartcampus -f scripts/init-db.sql
```

Variables de entorno:

- `PORT` — Puerto del servidor (por defecto 3000)
- `DATABASE_URL` — Conexión PostgreSQL (por defecto `postgresql://localhost:5432/smartcampus`)

## Ejecutar

```bash
cd server
npm install
npm run dev
```

En producción: `npm start`.

## PM2 (producción)

PM2 está instalado como dependencia de desarrollo. Para levantar la API con PM2:

```bash
cd server
npm run pm2:start
# o con el archivo de configuración:
npx pm2 start ecosystem.config.cjs
```

Comandos útiles: `npm run pm2:stop`, `npm run pm2:restart`, `npm run pm2:logs`. Para que PM2 arranque al reiniciar el servidor Ubuntu: `pm2 startup` y `pm2 save` (requiere PM2 instalado globalmente: `sudo npm install -g pm2`).
