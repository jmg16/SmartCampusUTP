# Configurar Bitácora en el servidor

Sigue estos pasos **en el servidor** (por SSH, como `jmartinez`) para que la API de bitácora funcione.

---

## 1. Crear la tabla en la BD de bitácora (192.168.10.11)

La base de datos está en **otro host** (`192.168.10.11`). Desde el servidor donde corre la API:

```bash
cd /home/jmartinez/smartcampus/smartcampus-web/server

# Ejecutar el script SQL en la BD remota (ajusta la contraseña si es distinta)
PGPASSWORD='ContraseñaSegura123' psql -h 192.168.10.11 -U bitacora_admin -d bitacora_db -f scripts/init-bitacora.sql
```

Si pide instalación de cliente PostgreSQL:

```bash
sudo apt update
sudo apt install -y postgresql-client
```

Comprueba que la tabla existe:

```bash
PGPASSWORD='ContraseñaSegura123' psql -h 192.168.10.11 -U bitacora_admin -d bitacora_db -c "\dt project_logs"
```

---

## 2. Variables de entorno para la API

La API necesita estas variables (además de `DATABASE_URL` para la landing):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `BITACORA_DATABASE_URL` | Conexión a la BD de bitácora | `postgres://bitacora_admin:ContraseñaSegura123@192.168.10.11:5432/bitacora_db` |
| `BITACORA_JWT_SECRET` | Clave secreta para firmar el JWT (usa una larga y aleatoria) | `mi_clave_secreta_muy_larga_123` |
| `BITACORA_ADMIN_USER` | Usuario para el login del dashboard | `jmartinez` |
| `BITACORA_ADMIN_PASSWORD` | Contraseña del admin del dashboard | La que elijas |

---

## 3. Opción A: Archivo de entorno y PM2

En el servidor, crea un archivo **solo en el servidor** (no lo subas a git) con las variables reales:

```bash
cd /home/jmartinez/smartcampus/smartcampus-web/server
nano .env.bitacora
```

Pega y **ajusta** los valores (contraseña real, JWT secreto fuerte, usuario/contraseña admin):

```env
DATABASE_URL=postgresql://smartcampus:SmartCampusutp7@localhost:5432/smartcampus
BITACORA_DATABASE_URL=postgres://bitacora_admin:ContraseñaSegura123@192.168.10.11:5432/bitacora_db
BITACORA_JWT_SECRET=pon_aqui_una_clave_larga_y_aleatoria
BITACORA_ADMIN_USER=jmartinez
BITACORA_ADMIN_PASSWORD=tu_contraseña_admin
```

Guarda (Ctrl+O, Enter, Ctrl+X). Luego arranca/reinicia la API cargando ese archivo:

```bash
cd /home/jmartinez/smartcampus/smartcampus-web/server
npm install
set -a && source .env.bitacora && set +a
npx pm2 delete smartcampus-api 2>/dev/null || true
npx pm2 start index.js --name smartcampus-api
npx pm2 save
```

Para reinicios futuros (tras `git pull` o cambios):

```bash
cd /home/jmartinez/smartcampus/smartcampus-web/server
set -a && source .env.bitacora && set +a
npx pm2 restart smartcampus-api --update-env
```

---

## 4. Opción B: Pasar variables en una sola línea (sin archivo)

Si prefieres no usar `.env.bitacora`, puedes exportar y arrancar así (sustituye los valores):

```bash
cd /home/jmartinez/smartcampus/smartcampus-web/server
npm install

export DATABASE_URL="postgresql://smartcampus:SmartCampusutp7@localhost:5432/smartcampus"
export BITACORA_DATABASE_URL="postgres://bitacora_admin:ContraseñaSegura123@192.168.10.11:5432/bitacora_db"
export BITACORA_JWT_SECRET="una_clave_secreta_larga_y_unica"
export BITACORA_ADMIN_USER="jmartinez"
export BITACORA_ADMIN_PASSWORD="tu_contraseña_admin"

npx pm2 delete smartcampus-api 2>/dev/null || true
npx pm2 start index.js --name smartcampus-api --update-env
npx pm2 save
```

Para que PM2 guarde estas variables y las use al reiniciar:

```bash
npx pm2 restart smartcampus-api --update-env
npx pm2 save
```

---

## 5. Comprobar que funciona

```bash
# Login (usa BITACORA_ADMIN_USER y BITACORA_ADMIN_PASSWORD)
curl -s -X POST http://localhost:3000/api/bitacora/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"jmartinez","password":"tu_contraseña_admin"}'
```

Deberías recibir `{"ok":true,"token":"..."}`.

```bash
# Listar logs (puede estar vacío al inicio)
curl -s http://localhost:3000/api/bitacora/logs
```

Deberías recibir `{"ok":true,"datos":[]}` o con registros.

---

## 6. Firewall / red

El servidor donde corre Node (smartcampusch) debe poder conectar a **192.168.10.11:5432** (PostgreSQL). Si hay firewall, abre el puerto 5432 hacia esa IP o verifica que estén en la misma red.

---

## Resumen rápido

1. Instalar `postgresql-client` si hace falta.
2. Ejecutar `scripts/init-bitacora.sql` en la BD `bitacora_db` en 192.168.10.11.
3. Crear `.env.bitacora` (o exportar variables) con `BITACORA_*` y credenciales admin.
4. `npm install` en `server`, luego `pm2 start` o `pm2 restart` con esas variables.
5. Probar `POST /api/bitacora/login` y `GET /api/bitacora/logs`.
