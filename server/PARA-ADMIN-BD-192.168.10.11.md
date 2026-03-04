# Para el administrador del servidor de BD (192.168.10.11)

La aplicación Smart Campus corre en **smartcampusch** (IP **192.168.10.10**) y necesita conectarse a PostgreSQL en este servidor para el módulo de bitácora.

**Base de datos:** `bitacora_db`  
**Usuario:** `bitacora_admin`  
**Puerto:** 5432  

Para que la conexión desde 192.168.10.10 funcione, por favor configurar lo siguiente en **192.168.10.11**:

---

## 1. Que PostgreSQL escuche en la red

En el archivo de configuración de PostgreSQL (por ejemplo `/etc/postgresql/14/main/postgresql.conf` o la versión que tengan), asegurarse de que:

```ini
listen_addresses = '*'
```

(o al menos `listen_addresses = 'localhost,192.168.10.11'`).

Reiniciar PostgreSQL después del cambio:

```bash
sudo systemctl restart postgresql
```

---

## 2. Permitir conexiones desde el servidor de la aplicación

En `pg_hba.conf` (normalmente en el mismo directorio que `postgresql.conf`), añadir una línea que permita al servidor de la app conectarse a la base `bitacora_db` con el usuario `bitacora_admin`:

```text
host    bitacora_db    bitacora_admin    192.168.10.10/32    scram-sha-256
```

Recargar la configuración:

```bash
sudo systemctl reload postgresql
```

---

## 3. Firewall

Si hay firewall (UFW, iptables, etc.), permitir el puerto **5432** entrante desde la IP **192.168.10.10** (o desde la red 192.168.10.0/24 si aplica).

Ejemplo con UFW:

```bash
sudo ufw allow from 192.168.10.10 to any port 5432
sudo ufw reload
```

---

## 4. Comprobar

Desde el servidor de la aplicación (192.168.10.10) se puede verificar con:

```bash
nc -zv 192.168.10.11 5432
```

Si la conexión es correcta, debería indicar que el puerto está abierto.

---

**Contacto:** Si hace falta la contraseña del usuario `bitacora_admin` o crear la base/usuario, coordinar con el equipo del proyecto Smart Campus.
