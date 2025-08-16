# 🚀 Despliegue Rápido - Torneo con Base de Datos

## Paso 1: Desplegar API en Render (5 minutos)

1. **Crear repositorio para la API**:
   ```bash
   cd api
   git init
   git add .
   git commit -m "API inicial"
   git remote add origin https://github.com/tu-usuario/torneo-api.git
   git push -u origin main
   ```

2. **Configurar en Render**:
   - Ve a [render.com](https://render.com)
   - Conecta tu cuenta de GitHub
   - Crea nuevo "Web Service"
   - Conecta el repositorio `torneo-api`
   - Configuración:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment**: Node.js

3. **Obtener URL de la API**:
   - Render te dará una URL como: `https://tu-app.onrender.com`

## Paso 2: Configurar Frontend

1. **Editar configuración de API**:
   ```javascript
   // En js/api.js, línea 3:
   BASE_URL: 'https://tu-app.onrender.com/api'
   ```

2. **Subir cambios a GitHub Pages**:
   ```bash
   git add .
   git commit -m "Conectar con API"
   git push origin main
   ```

## Paso 3: ¡Listo! 🎉

- **Frontend**: `https://tu-usuario.github.io/torneo-videojuegos`
- **API**: `https://tu-app.onrender.com`

### Funcionalidades:
✅ Datos sincronizados entre dispositivos
✅ Funciona offline (guarda localmente)
✅ Sincronización automática cada 5 segundos
✅ Indicador de estado de conexión

### Prueba:
1. Abre la app en tu celular
2. Registra un equipo
3. Abre la app en otro dispositivo
4. ¡Los datos aparecen automáticamente!

## Solución de Problemas

### API no responde:
- Verifica que el servicio en Render esté activo
- Revisa los logs en el dashboard de Render

### Datos no se sincronizan:
- Verifica la URL de la API en `js/api.js`
- Abre las herramientas de desarrollador y revisa la consola

### Render se duerme (plan gratuito):
- El primer acceso puede tardar 30 segundos
- Considera usar un servicio de "ping" para mantenerlo activo

## Costos:
- **Render (API)**: Gratis (con limitaciones)
- **GitHub Pages**: Gratis
- **Total**: $0 💰
