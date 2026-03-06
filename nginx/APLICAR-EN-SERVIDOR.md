# Corregir "Cannot GET /" en smartcampusch.utp.ac.pa

Ese error aparece porque Nginx está enviando **todo** (incluida la ruta `/`) al Node.js. Node solo es la API; la web (Angular) debe ser servida por Nginx desde la carpeta del build.

## Pasos en el servidor (por SSH)

### 1. Comprobar que existe el build de Angular

```bash
ls -la /home/jmartinez/smartcampus/smartcampus-web/dist/smartcampus-web/browser/index.html
```

Si no existe, primero hay que hacer build y copiar (o usar la ruta donde sí esté el build):

```bash
cd /home/jmartinez/smartcampus/smartcampus-web
git pull origin dev
npm install
npm run build -- --configuration production
```

### 2. Sustituir la configuración de Nginx

Copia el ejemplo al sitio activo (sobrescribe la config actual):

```bash
sudo cp /home/jmartinez/smartcampus/smartcampus-web/nginx/smartcampus.conf.example /etc/nginx/sites-available/smartcampus
```

Si en tu servidor el sitio se llama distinto (por ejemplo `default`), edita ese archivo:

```bash
sudo nano /etc/nginx/sites-available/smartcampus
```

Asegúrate de que:
- `root` apunte a la carpeta del build, por ejemplo:  
  `root /home/jmartinez/smartcampus/smartcampus-web/dist/smartcampus-web/browser;`
- Exista `location /api { proxy_pass http://127.0.0.1:3000; ... }`
- Exista `location / { try_files $uri $uri/ /index.html; }`

### 3. Activar el sitio y comprobar

```bash
sudo ln -sf /etc/nginx/sites-available/smartcampus /etc/nginx/sites-enabled/
sudo nginx -t
```

Si `nginx -t` sale "syntax is ok", recarga Nginx:

```bash
sudo systemctl reload nginx
```

### 4. Probar en el navegador

Abre: http://smartcampusch.utp.ac.pa/

Deberías ver la landing de Smart Campus, no "Cannot GET /".

---

## Resumen del cambio

| Antes (mal) | Después (bien) |
|-------------|----------------|
| `location / { proxy_pass http://localhost:3000; }` | `root .../dist/.../browser;` y `location / { try_files $uri $uri/ /index.html; }` |
| Todo va a Node → "Cannot GET /" | Nginx sirve HTML/JS de Angular; solo `/api` va a Node |
