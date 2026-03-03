# Despliegue en Ubuntu con Nginx

Guía para que Javier (o quien despliegue) evite el **403 Forbidden** y deje Nginx actuando como proxy inverso para Smart Campus.

---

## 1. Nginx como proxy inverso

Nginx debe **servir el frontend Angular** (archivos estáticos) y **enviar /api al backend Node.js**.

- Copiar `smartcampus.conf.example` a la configuración del sitio, por ejemplo:

```bash
sudo cp nginx/smartcampus.conf.example /etc/nginx/sites-available/smartcampus
```

- Editar y sustituir:
  - **`/ruta/al/proyecto`** → ruta real del proyecto (ej. `/home/javier/smartcampus-web`)
  - **`server_name`** → dominio o IP del servidor (ej. `smartcampusch.utp.ac.pa`)

- Activar el sitio y comprobar:

```bash
sudo ln -sf /etc/nginx/sites-available/smartcampus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Importante: en el bloque `location /api` debe estar **`proxy_pass http://127.0.0.1:3000`** (o el puerto donde corre la API). Si falta esto, Nginx no actuará como proxy y puede acabar devolviendo 403 al intentar listar un directorio.

---

## 2. Permisos de archivos y directorios

Si Nginx sirve los archivos estáticos del frontend, el usuario de Nginx (`www-data`) debe poder **leer** esos archivos y **recorrer** los directorios.

Ajustar propietario y permisos del directorio del build (Angular):

```bash
# Sustituir /ruta/al/proyecto por la ruta real
export PROYECTO="/ruta/al/proyecto/smartcampus-web"
export WEBROOT="$PROYECTO/dist/smartcampus-web/browser"

# Propiedad para Nginx
sudo chown -R www-data:www-data "$WEBROOT"

# Directorios: lectura y ejecución para entrar
sudo find "$WEBROOT" -type d -exec chmod 755 {} \;

# Archivos: solo lectura
sudo find "$WEBROOT" -type f -exec chmod 644 {} \;
```

Si el proyecto está en el home del usuario, se puede dejar el propietario y solo dar lectura a `www-data`, por ejemplo:

```bash
sudo chmod -R o+rX "$WEBROOT"
```

---

## 3. Diagnóstico: logs de Nginx

Para ver **por qué** Nginx devuelve 403 u otro error:

```bash
sudo tail -f /var/log/nginx/error.log
```

Mantener este comando en ejecución y recargar la página en el navegador. En el log aparecerán mensajes como:

- `directory index of "/var/www/html/" is forbidden` → falta `index` o `try_files`, o la raíz no es la del build.
- `permission denied` → revisar propietario y permisos (paso 2).
- `no such file or directory` → la ruta `root` en la config no existe o es incorrecta.

---

## Resumen de comprobaciones

| Comprobación | Acción |
|--------------|--------|
| ¿Existe `location /api` con `proxy_pass` al puerto de Node? | Revisar config en `sites-available`. |
| ¿El `root` apunta a `.../dist/smartcampus-web/browser`? | Ruta exacta del build de Angular. |
| ¿Node/API está corriendo en ese puerto (ej. 3000)? | `pm2 list` o `systemctl status` según cómo se levante. |
| ¿`www-data` puede leer el `root`? | `sudo -u www-data cat $WEBROOT/index.html`. |
| ¿Qué dice Nginx? | `sudo tail -f /var/log/nginx/error.log`. |
