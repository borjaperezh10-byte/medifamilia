# MediFamilia — despliegue (Vercel + Upstash + web push)

App de agenda de medicación familiar con sincronización entre móviles y notificaciones push fiables (la app cerrada). 4 perfiles fijos: Borja, Citla, Martina, Diego.

## Piezas

- Frontend estático (`index.html`, `sw.js`, `manifest.json`, `icon.png`)
- API en Vercel (`/api/*.js`): estado del hogar, suscripciones push, análisis de foto, y el endpoint que envía los avisos
- Base de datos: Upstash Redis (gratis)
- Disparador cada minuto: cron externo gratuito (cron-job.org), porque el cron de Vercel en plan Hobby solo permite 1/día

## Pasos

### 1. Subir a GitHub y desplegar en Vercel
Sube esta carpeta a un repo y créate el proyecto en Vercel (framework "Other", sin build command).

### 2. Crear la base de datos Upstash Redis
En vercel.com → tu proyecto → pestaña Storage → "Create Database" → Upstash → Redis. Al conectarla, Vercel añade solas las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`. El cliente `@upstash/redis` usa `Redis.fromEnv()`, que lee `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. Si Vercel las nombra con prefijo `KV_`, añade también estas dos variables copiando los mismos valores:
```
UPSTASH_REDIS_REST_URL   = (mismo valor que KV_REST_API_URL)
UPSTASH_REDIS_REST_TOKEN = (mismo valor que KV_REST_API_TOKEN)
```

### 3. Variables de entorno (Vercel → Settings → Environment Variables)
```
VAPID_PUBLIC_KEY   = BMmHrqEjyK6tE9SFA1ug869VmUDKgUATA0NzA0v6OxjXp8UK_bPaMmrqxJOfmYwyLJuVw9hbB200bXQnC9SEUcU
VAPID_PRIVATE_KEY  = nEyT1LqfSFZv1_ffYwcqGsv00ta-qbAii2-Gcxig8Gc
CRON_SECRET        = (inventa una cadena larga y aleatoria)
ANTHROPIC_API_KEY  = (tu clave de platform.claude.com, con facturación activa)
```
La clave pública VAPID ya está también dentro de `index.html`. Si algún día regeneras las claves, cámbiala en los dos sitios.

### 4. Programar el envío cada minuto (cron externo)
Regístrate gratis en cron-job.org y crea un job:
- URL: `https://TU-PROYECTO.vercel.app/api/cron`
- Cada 1 minuto
- Cabecera personalizada: `Authorization: Bearer EL-VALOR-DE-CRON_SECRET`

### 5. Instalar en el iPhone
Abre la URL en **Safari** → Compartir → **Añadir a pantalla de inicio**. Ábrela desde el icono (no desde una pestaña) y pulsa "Activar notificaciones".

## Notas importantes

- **Código de hogar**: al abrir, cada móvil introduce el mismo código (p. ej. `casa-lopez-2026`) para compartir datos. Quien conozca el código ve los datos, así que usa uno no obvio.
- **Notificaciones**: llegan con la app cerrada en iOS 16.4+ SIEMPRE que esté añadida a la pantalla de inicio.
- **"Alarma" que suene en silencio / Modo Concentración**: NO es posible en web app (iOS lo reserva a apps nativas). El estado "⏰ Alarma" refuerza el aviso (vibración y notificación persistente) y suena si la app está abierta, pero no atraviesa el silencio del móvil.
- **Coste del análisis de foto**: ~1-2 céntimos por foto, a tu cuenta de la API de Anthropic.
