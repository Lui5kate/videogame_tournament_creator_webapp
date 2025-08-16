# 🎮 Torneo de Videojuegos - App Web

Una aplicación web completa para gestionar torneos de videojuegos por parejas, con estilo arcade retro y funcionalidades avanzadas.

## ✨ Características

### 🏆 Gestión de Torneo
- **Brackets dinámicos**: Visualización automática del estado del torneo
- **Sistema de puntos**: 3 puntos por victoria, 1 por participación
- **Seguimiento en tiempo real**: Estado de partidas y próximos matches

### 👥 Registro de Equipos
- **Registro abierto**: Sin autenticación requerida
- **Fotos flexibles**: Una foto de equipo o fotos individuales con collage automático
- **Perfiles detallados**: Estadísticas completas por equipo

### 🎯 Gestión de Juegos
- **Juegos predefinidos**: Mario Kart, Smash Bros, Marvel vs Capcom 3, etc.
- **Agregar juegos**: Funcionalidad para añadir nuevos juegos
- **Asignación automática**: Los juegos se asignan aleatoriamente a las partidas

### 📊 Clasificación
- **Tabla de posiciones**: Ordenada por puntos y victorias
- **Indicadores visuales**: Medallas para los primeros 3 lugares
- **Estadísticas completas**: Partidas jugadas, ganadas, perdidas y puntos

### 💬 Chat en Vivo
- **Chat simple**: Sin necesidad de login
- **Persistencia local**: Los mensajes se guardan durante el evento
- **Timestamps**: Hora de cada mensaje

## 🎨 Diseño

### Tema Arcade Retro
- **Colores vibrantes**: Naranja, amarillo y azul con gradientes
- **Tipografía pixel**: Fuente "Press Start 2P" estilo 8-bit
- **Bordes pixelados**: Elementos con estilo retro gaming
- **Animaciones suaves**: Transiciones y efectos hover

### Responsive Design
- **Mobile-first**: Optimizado para celulares y tablets
- **Navegación adaptativa**: Menú hamburguesa en dispositivos móviles
- **Grids flexibles**: Contenido que se adapta a cualquier pantalla

## 🚀 Instalación y Uso

### Opción 1: Uso Local
1. Descarga todos los archivos
2. Abre `index.html` en tu navegador
3. ¡Listo para usar!

### Opción 2: GitHub Pages
1. Sube los archivos a un repositorio de GitHub
2. Activa GitHub Pages en la configuración del repositorio
3. Accede desde cualquier dispositivo con la URL generada

## 📱 Cómo Usar la App

### 1. Registro de Equipos
- Ve a la sección "Registro"
- Completa el nombre del equipo y jugadores
- Sube fotos (opcional pero recomendado)
- Haz clic en "Registrar Equipo"

### 2. Gestión de Juegos
- Ve a la sección "Juegos"
- Revisa los juegos disponibles
- Agrega nuevos juegos si es necesario

### 3. Seguimiento del Torneo
- La sección "Brackets" muestra el estado actual
- Los brackets se generan automáticamente con 2+ equipos
- Declara ganadores haciendo clic en los botones correspondientes

### 4. Chat y Comunicación
- Usa el chat para comentarios y celebraciones
- No requiere registro, solo ingresa tu nombre

## 💾 Almacenamiento

La app usa **localStorage** del navegador para guardar:
- Equipos registrados
- Partidas y resultados
- Mensajes del chat
- Juegos personalizados

**Importante**: Los datos se mantienen mientras no se borre el caché del navegador.

## 🛠️ Estructura del Proyecto

```
torneo-videojuegos/
├── index.html          # Página principal
├── quick-start.html    # Guía de inicio rápido
├── css/
│   └── styles.css      # Estilos arcade retro
├── js/
│   └── app.js          # Funcionalidad completa
└── README.md           # Este archivo
```

## 🎯 Funcionalidades Técnicas

### Sin Backend
- **100% Frontend**: HTML, CSS y JavaScript puro
- **Sin base de datos**: Todo en localStorage
- **Sin autenticación**: Acceso libre para todos

### Compatibilidad
- **Navegadores modernos**: Chrome, Firefox, Safari, Edge
- **Dispositivos móviles**: iOS y Android
- **GitHub Pages**: Compatible sin configuración adicional

## 🎉 Consejos para el Torneo

### Antes del Evento
1. Prueba la app con datos de ejemplo
2. Asegúrate de que todos puedan acceder a la URL
3. Prepara un dispositivo principal para gestionar resultados

### Durante el Evento
1. Deja que los participantes se registren ellos mismos
2. Usa el chat para anuncios y celebraciones
3. Actualiza los resultados en tiempo real

### Después del Evento
1. Toma screenshots de la clasificación final
2. Los datos quedan guardados para futuras referencias

## 🔧 Personalización

### Cambiar Colores
Edita las variables CSS en `styles.css`:
```css
:root {
    --primary-color: #ff6b35;    /* Color principal */
    --secondary-color: #f7931e;  /* Color secundario */
    --accent-color: #ffcc02;     /* Color de acento */
}
```

### Agregar Juegos por Defecto
Modifica el array `games` en `app.js`:
```javascript
let games = [
    { id: 1, name: 'Tu Juego', emoji: '🎮' }
];
```

### Cambiar Sistema de Puntos
Modifica la función `declareWinner()` en `app.js` para cambiar los puntos otorgados.

## 📞 Soporte

Si encuentras algún problema:
1. Revisa que todos los archivos estén en su lugar
2. Verifica que JavaScript esté habilitado
3. Prueba en modo incógnito para descartar problemas de caché

---

**¡Que disfrutes tu torneo! 🎮🏆**

*Creado con ❤️ para celebrar tu cumpleaños*
