// ===== CONFIGURACIÓN DE LA API =====
const API_CONFIG = {
    // Cambia esta URL por la de tu servicio en Render
    BASE_URL: 'https://tu-app-render.onrender.com/api',
    TOURNAMENT_NAME: 'torneo-principal', // Nombre único del torneo
    SYNC_INTERVAL: 5000 // Sincronizar cada 5 segundos
};

// ===== FUNCIONES DE API =====
class TournamentAPI {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
        this.tournamentName = API_CONFIG.TOURNAMENT_NAME;
        this.isOnline = navigator.onLine;
        this.syncInterval = null;
        
        // Detectar cambios de conectividad
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Conexión restaurada - sincronizando...');
            this.syncWithServer();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Sin conexión - modo offline');
        });
    }
    
    // Hacer petición HTTP con manejo de errores
    async makeRequest(endpoint, options = {}) {
        if (!this.isOnline) {
            throw new Error('Sin conexión a internet');
        }
        
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Error en petición API:', error);
            throw error;
        }
    }
    
    // Obtener datos del torneo
    async getTournament() {
        return await this.makeRequest(`/tournament/${this.tournamentName}`);
    }
    
    // Actualizar datos del torneo
    async updateTournament(data) {
        return await this.makeRequest(`/tournament/${this.tournamentName}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    // Obtener equipos
    async getTeams() {
        return await this.makeRequest(`/tournament/${this.tournamentName}/teams`);
    }
    
    // Agregar equipo
    async addTeam(teamData) {
        return await this.makeRequest(`/tournament/${this.tournamentName}/teams`, {
            method: 'POST',
            body: JSON.stringify(teamData)
        });
    }
    
    // Obtener mensajes de chat
    async getChatMessages() {
        return await this.makeRequest(`/tournament/${this.tournamentName}/chat`);
    }
    
    // Agregar mensaje de chat
    async addChatMessage(messageData) {
        return await this.makeRequest(`/tournament/${this.tournamentName}/chat`, {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
    }
    
    // Sincronizar datos locales con servidor
    async syncWithServer() {
        try {
            console.log('🔄 Sincronizando con servidor...');
            
            // Obtener datos del servidor
            const serverData = await this.getTournament();
            
            // Comparar con datos locales
            const localTeams = JSON.parse(localStorage.getItem('tournament-teams') || '[]');
            const localMessages = JSON.parse(localStorage.getItem('tournament-chat') || '[]');
            
            // Actualizar datos locales si el servidor tiene datos más recientes
            if (serverData.data.teams.length > localTeams.length) {
                localStorage.setItem('tournament-teams', JSON.stringify(serverData.data.teams));
                teams = serverData.data.teams;
                loadTeams();
            }
            
            if (serverData.data.chatMessages.length > localMessages.length) {
                localStorage.setItem('tournament-chat', JSON.stringify(serverData.data.chatMessages));
                chatMessages = serverData.data.chatMessages;
                loadChatMessages();
            }
            
            // Si hay datos locales más recientes, enviarlos al servidor
            if (localTeams.length > serverData.data.teams.length || 
                localMessages.length > serverData.data.chatMessages.length) {
                
                const updatedData = {
                    teams: localTeams.length > serverData.data.teams.length ? localTeams : serverData.data.teams,
                    games: JSON.parse(localStorage.getItem('tournament-games') || '[]'),
                    chatMessages: localMessages.length > serverData.data.chatMessages.length ? localMessages : serverData.data.chatMessages,
                    tournamentState: localStorage.getItem('tournament-state') || 'preparing',
                    bracket: JSON.parse(localStorage.getItem('tournament-bracket') || 'null')
                };
                
                await this.updateTournament(updatedData);
            }
            
            console.log('✅ Sincronización completada');
            
        } catch (error) {
            console.warn('⚠️ Error en sincronización:', error.message);
        }
    }
    
    // Iniciar sincronización automática
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (this.isOnline) {
                this.syncWithServer();
            }
        }, API_CONFIG.SYNC_INTERVAL);
        
        console.log('🔄 Sincronización automática iniciada');
    }
    
    // Detener sincronización automática
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log('⏹️ Sincronización automática detenida');
    }
}

// Instancia global de la API
const tournamentAPI = new TournamentAPI();

// ===== FUNCIONES MODIFICADAS PARA USAR LA API =====

// Función modificada para registrar equipo
async function registerTeamWithAPI(teamData) {
    try {
        // Guardar localmente primero
        teams.push(teamData);
        localStorage.setItem('tournament-teams', JSON.stringify(teams));
        
        // Intentar enviar al servidor
        if (tournamentAPI.isOnline) {
            await tournamentAPI.addTeam(teamData);
            console.log('✅ Equipo sincronizado con servidor');
        } else {
            console.log('📴 Equipo guardado localmente - se sincronizará cuando haya conexión');
        }
        
        loadTeams();
        updateLeaderboard();
        generateBrackets();
        
    } catch (error) {
        console.error('❌ Error registrando equipo:', error);
        // El equipo ya está guardado localmente, así que no hay problema
    }
}

// Función modificada para enviar mensaje de chat
async function sendChatMessageWithAPI(username, message) {
    try {
        const messageData = {
            username: username,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        // Guardar localmente primero
        chatMessages.push(messageData);
        localStorage.setItem('tournament-chat', JSON.stringify(chatMessages));
        
        // Intentar enviar al servidor
        if (tournamentAPI.isOnline) {
            await tournamentAPI.addChatMessage({
                username: username,
                message: message
            });
            console.log('✅ Mensaje sincronizado con servidor');
        } else {
            console.log('📴 Mensaje guardado localmente - se sincronizará cuando haya conexión');
        }
        
        loadChatMessages();
        
    } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        // El mensaje ya está guardado localmente
    }
}

// Función para mostrar estado de conexión
function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) {
        // Crear indicador de estado si no existe
        const indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(indicator);
    }
    
    const indicator = document.getElementById('connection-status');
    
    if (tournamentAPI.isOnline) {
        indicator.textContent = '🌐 En línea';
        indicator.style.backgroundColor = '#4CAF50';
        indicator.style.color = 'white';
    } else {
        indicator.textContent = '📴 Sin conexión';
        indicator.style.backgroundColor = '#f44336';
        indicator.style.color = 'white';
    }
}

// Inicializar API cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Actualizar estado de conexión
    updateConnectionStatus();
    
    // Iniciar sincronización automática
    tournamentAPI.startAutoSync();
    
    // Sincronizar inmediatamente
    if (tournamentAPI.isOnline) {
        tournamentAPI.syncWithServer();
    }
    
    console.log('🚀 Sistema de API inicializado');
});

// Actualizar estado de conexión cuando cambie
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
