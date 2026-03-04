/**
 * PM2: arrancar con « pm2 start ecosystem.config.cjs »
 *
 * Variables de bitácora: definir en el servidor (no commitear valores reales).
 * Ejemplo en CONFIGURAR-BITACORA-SERVIDOR.md
 */
module.exports = {
  apps: [
    {
      name: 'smartcampus-api',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        // Ajustar en el servidor; o usar: set -a && source .env.bitacora && pm2 start ecosystem.config.cjs
        // DATABASE_URL: 'postgresql://smartcampus:...@localhost:5432/smartcampus',
        // BITACORA_DATABASE_URL: 'postgres://bitacora_admin:...@192.168.10.11:5432/bitacora_db',
        // BITACORA_JWT_SECRET: '...',
        // BITACORA_ADMIN_USER: 'jmartinez',
        // BITACORA_ADMIN_PASSWORD: '...',
      },
    },
  ],
};
