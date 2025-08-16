# API del Torneo de Videojuegos

API REST para sincronizar datos del torneo entre dispositivos.

## Despliegue en Render

1. Sube la carpeta `api` a un repositorio de GitHub separado
2. Conecta el repositorio a Render
3. Configura el servicio:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node.js
   - **Plan**: Free

## Variables de Entorno

- `PORT`: Puerto del servidor (automático en Render)
- `NODE_ENV`: production

## Endpoints

### Torneo
- `GET /api/tournament/:name` - Obtener o crear torneo
- `PUT /api/tournament/:name` - Actualizar torneo

### Equipos
- `GET /api/tournament/:name/teams` - Obtener equipos
- `POST /api/tournament/:name/teams` - Agregar equipo

### Chat
- `GET /api/tournament/:name/chat` - Obtener mensajes
- `POST /api/tournament/:name/chat` - Enviar mensaje

### Salud
- `GET /health` - Estado del servidor
