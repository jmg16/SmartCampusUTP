#!/usr/bin/env bash
# Actualizar servidor con la rama dev: pull, build Angular, copiar a ~/smartcampus/web, reiniciar API.
# Ejecutar desde la raíz del repo en el servidor (ej. ~/smartcampus-web).

set -e

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
WEB_ROOT="${WEB_ROOT:-$HOME/smartcampus/web}"

echo "==> Repo: $REPO_DIR"
echo "==> Web root: $WEB_ROOT"
echo ""

cd "$REPO_DIR"

echo "==> git pull origin dev"
git pull origin dev

echo ""
echo "==> npm install (raíz)"
npm install

echo ""
echo "==> Build Angular (producción)"
npm run build -- --configuration production

echo ""
echo "==> Copiando dist/smartcampus-web/browser -> $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rsync -av --delete dist/smartcampus-web/browser/ "$WEB_ROOT/"

# Marcar fecha de despliegue (para comprobar que este script actualizó los archivos)
DEPLOY_MARKER="Última actualización: $(date '+%Y-%m-%d %H:%M:%S')"
echo "$DEPLOY_MARKER" > "$WEB_ROOT/.deploy-date"
echo "$DEPLOY_MARKER" > "dist/smartcampus-web/browser/.deploy-date"

echo ""
echo "==> IMPORTANTE: Nginx debe tener 'root' apuntando a una de estas rutas:"
echo "    - $WEB_ROOT"
echo "    - $REPO_DIR/dist/smartcampus-web/browser"
echo "    (Comprueba con: grep -r 'root' /etc/nginx/)"
echo ""
echo "==> API: instalar deps y reiniciar PM2 (smartcampus-api)"
cd "$REPO_DIR/server"
npm install --production
# Migración opcional: columna cover_image (solo si aún no la tienes)
if [[ -f scripts/alter-bitacora-add-cover.sql ]]; then
  echo "    Si la BD de bitácora no tiene la columna cover_image, ejecuta una vez:"
  echo "    PGPASSWORD='...' psql -h 192.168.10.11 -p 5432 -U bitacora_admin -d bitacora_db -f $REPO_DIR/server/scripts/alter-bitacora-add-cover.sql"
fi
# Cargar .env.bitacora para que PM2 herede BITACORA_* (varios admins, JWT, BD)
if [[ -f .env.bitacora ]]; then
  set -a
  source .env.bitacora
  set +a
  echo "    (.env.bitacora cargado para este reinicio)"
fi
if command -v pm2 &>/dev/null; then
  pm2 restart smartcampus-api --update-env || pm2 start ecosystem.config.cjs
else
  npx pm2 restart smartcampus-api --update-env || npx pm2 start ecosystem.config.cjs
fi

echo ""
echo "==> Listo. Para verificar que el sitio es el recién desplegado:"
echo "    cat $WEB_ROOT/.deploy-date"
echo "    (o cat $REPO_DIR/dist/smartcampus-web/browser/.deploy-date si Nginx apunta al dist del repo)"
echo "    Recarga Nginx si aplica: sudo systemctl reload nginx"
