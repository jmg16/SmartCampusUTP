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

echo ""
echo "==> API: instalar deps y reiniciar PM2 (smartcampus-api)"
cd "$REPO_DIR/server"
npm install --production
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
echo "==> Listo. Frontend en $WEB_ROOT; recarga Nginx si aplica: sudo systemctl reload nginx"
