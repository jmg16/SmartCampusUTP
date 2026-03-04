# Bitácora en el mismo servidor (smartcampusch)

Si no puedes usar la BD remota en 192.168.10.11 (firewall, permisos, etc.), puedes tener la base de datos de bitácora **en el mismo servidor donde corre la API** (smartcampusch). Todo queda en localhost y no depende de otro equipo.

---

## Requisitos

- Acceso SSH a **smartcampusch** (192.168.10.10).
- PostgreSQL instalado en smartcampusch (ya lo tienes si la landing usa `DATABASE_URL` con localhost).

---

## Paso 1: Conectar por SSH al servidor

```bash
ssh jmartinez@10.192.64.250 -p 2210
```

(Te conectas al salto; si entras directo a smartcampusch con otra IP/host, usa esa.)

---

## Paso 2: Comprobar que PostgreSQL está instalado y corriendo

```bash
sudo systemctl status postgresql
```

Si no está instalado:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## Paso 3: Crear la base de datos y el usuario (como superusuario de PostgreSQL)

Entrar al shell de PostgreSQL con el usuario por defecto del sistema (normalmente `postgres`):

```bash
sudo -u postgres psql
```

Dentro de `psql`, ejecutar (sustituye `Jmartinez7*` por la contraseña que quieras para `bitacora_admin`):

```sql
-- Crear usuario para la bitácora
CREATE USER bitacora_admin WITH PASSWORD 'Jmartinez7*';

-- Crear la base de datos (owner = bitacora_admin)
CREATE DATABASE bitacora_db OWNER bitacora_admin;

-- Permisos para que bitacora_admin pueda usar la BD
GRANT ALL PRIVILEGES ON DATABASE bitacora_db TO bitacora_admin;
\connect bitacora_db
GRANT ALL ON SCHEMA public TO bitacora_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bitacora_admin;
```

Salir de psql:

```sql
\q
```

---

## Paso 4: Crear la tabla `project_logs`

Desde el servidor, en la carpeta del proyecto:

```bash
cd ~/smartcampus/smartcampus-web/server
sudo -u postgres psql -d bitacora_db -f scripts/init-bitacora.sql
```

Si da error de permisos, puedes ejecutar el script como el usuario que creó la BD. Una forma alternativa es conectarte como `bitacora_admin` (te pedirá la contraseña):

```bash
PGPASSWORD='Jmartinez7*' psql -h localhost -U bitacora_admin -d bitacora_db -f scripts/init-bitacora.sql
```

(Instala el cliente si hace falta: `sudo apt install -y postgresql-client`.)

Comprobar que la tabla existe:

```bash
PGPASSWORD='Jmartinez7*' psql -h localhost -U bitacora_admin -d bitacora_db -c "\dt project_logs"
```

Deberías ver la tabla `project_logs`.

---

## Paso 5: Crear o editar `.env.bitacora` en el servidor

La URL de la BD debe apuntar a **localhost**, no a 192.168.10.11:

```bash
cd ~/smartcampus/smartcampus-web/server
nano .env.bitacora
```

Contenido (ajusta las contraseñas si las cambiaste):

```env
DATABASE_URL=postgresql://smartcampus:SmartCampusutp7@localhost:5432/smartcampus
BITACORA_DATABASE_URL=postgres://bitacora_admin:Jmartinez7*@localhost:5432/bitacora_db
BITACORA_JWT_SECRET=smartcampus-bitacora-jwt-clave-secreta-2024
BITACORA_ADMIN_USER=jmartinez
BITACORA_ADMIN_PASSWORD=Jmartinez7*
```

Si la contraseña tiene `*`, en la URL a veces hay que codificarla: `Jmartinez7%2A`. Si algo falla al conectar, prueba con `%2A`.

Guarda: Ctrl+O, Enter, Ctrl+X.

---

## Paso 6: Cargar variables y reiniciar la API (PM2)

```bash
cd ~/smartcampus/smartcampus-web/server
set -a && source .env.bitacora && set +a
pm2 restart smartcampus-api --update-env
pm2 save
```

Si la API no estaba arrancada con PM2:

```bash
cd ~/smartcampus/smartcampus-web/server
set -a && source .env.bitacora && set +a
pm2 start index.js --name smartcampus-api
pm2 save
```

---

## Paso 7: Verificar que todo funciona

Probar conexión con el script (debería dar TCP OK y tabla existe). Como la BD está en localhost, indica el host al script:

```bash
cd ~/smartcampus/smartcampus-web/server
set -a && source .env.bitacora && export BITACORA_DB_HOST=localhost && set +a
npm run verificar-bitacora
```

Probar login por API:

```bash
curl -s -X POST http://localhost:3000/api/bitacora/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"jmartinez","password":"Jmartinez7*"}'
```

Deberías recibir algo como `{"ok":true,"token":"..."}`.

---

## Paso 8: Probar desde el navegador

Abre la URL del sitio (ej. la de smartcampusch), ve al enlace del **Panel administrativo** (p. ej. `/admin`), inicia sesión con:

- **Usuario:** jmartinez  
- **Contraseña:** la que pusiste en `BITACORA_ADMIN_PASSWORD` (ej. Jmartinez7*).

Ya puedes usar la bitácora (crear y listar avances).

---

## Resumen

| Dónde | Qué |
|-------|-----|
| Mismo servidor (smartcampusch) | PostgreSQL, base `bitacora_db`, usuario `bitacora_admin`, tabla `project_logs` |
| `.env.bitacora` | `BITACORA_DATABASE_URL=...@localhost:5432/bitacora_db` |
| No hace falta | Abrir puerto 5432 en 192.168.10.11 ni configurar pg_hba remoto |

Si más adelante quieres pasar la bitácora al servidor 192.168.10.11, solo cambias `BITACORA_DATABASE_URL` a ese host y reinicias la API.
