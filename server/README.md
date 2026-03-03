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
