console.log('🎮 TORNEO DE VIDEOJUEGOS - ARCHIVO JAVASCRIPT CARGADO CORRECTAMENTE 🎮');
console.log('Versión: Chat Sidebar Corregido - ' + new Date().toLocaleTimeString());

// ===== VARIABLES GLOBALES =====
let teams = JSON.parse(localStorage.getItem('tournament-teams')) || [];
let games = JSON.parse(localStorage.getItem('tournament-games')) || [
    { id: 1, name: 'Mario Kart', emoji: '🏎️', rules: 'Carrera de 4 vueltas. Gana el primero en llegar a la meta.' },
    { id: 2, name: 'Super Smash Bros', emoji: '👊', rules: 'Mejor de 3 rounds. Sin items. Escenarios neutrales.' },
    { id: 3, name: 'Marvel vs Capcom 3', emoji: '⚡', rules: 'Mejor de 5 rounds. Equipos de 3 personajes.' },
    { id: 4, name: 'Mario Party', emoji: '🎲', rules: '10 turnos. Gana quien tenga más estrellas al final.' },
    { id: 5, name: 'Street Fighter', emoji: '🥊', rules: 'Mejor de 5 rounds. Sin super meter inicial.' }
];

// Cargar matches con conversión de formato si es necesario
let matches = [];
try {
    const storedMatches = JSON.parse(localStorage.getItem('tournament-matches')) || [];
    matches = storedMatches.map(match => {
        // Si el match tiene el formato antiguo (con objetos completos), convertir a IDs
        if (match.team1 && typeof match.team1 === 'object') {
            return {
                id: match.id,
                round: match.round,
                team1Id: match.team1.id,
                team2Id: match.team2.id,
                gameId: match.game.id,
                completed: match.completed,
                winnerId: match.winner ? match.winner.id : null,
                completedAt: match.completedAt
            };
        }
        // Si ya tiene el formato nuevo, mantenerlo
        return match;
    });
} catch (error) {
    console.error('Error cargando matches:', error);
    matches = [];
}

let chatMessages = JSON.parse(localStorage.getItem('tournament-chat')) || [];
let tournamentState = localStorage.getItem('tournament-state') || 'preparing';
let gameQueue = JSON.parse(localStorage.getItem('tournament-game-queue')) || [];
let currentGameIndex = parseInt(localStorage.getItem('tournament-current-game-index')) || 0;

// ===== FUNCIONES AUXILIARES =====
function getTeamById(id) {
    return teams.find(team => team.id === id);
}

function getGameById(id) {
    return games.find(game => game.id === id);
}

function getMatchWithObjects(match) {
    return {
        ...match,
        team1: getTeamById(match.team1Id),
        team2: getTeamById(match.team2Id),
        game: getGameById(match.gameId),
        winner: match.winnerId ? getTeamById(match.winnerId) : null
    };
}

// ===== FUNCIONES BÁSICAS =====
function showSection(sectionName) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const navMenu = document.querySelector('.nav-menu');
    const hamburger = document.querySelector('.hamburger');
    if (navMenu) navMenu.classList.remove('active');
    if (hamburger) hamburger.classList.remove('active');
}

function initializeApp() {
    if (!localStorage.getItem('tournament-games')) {
        localStorage.setItem('tournament-games', JSON.stringify(games));
    }
    
    // Inicializar cola de juegos
    initializeGameQueue();
    
    showSection('brackets');
}

// ===== CHAT SIDEBAR SIMPLIFICADO =====
function handleChatMessageSidebar(e) {
    e.preventDefault();
    
    const message = document.getElementById('chat-message-sidebar').value.trim();
    const name = document.getElementById('chat-name-sidebar').value.trim();
    
    if (!message || !name) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    const newMessage = {
        id: Date.now(),
        author: name,
        message: message,
        timestamp: new Date().toISOString()
    };
    
    chatMessages.push(newMessage);
    
    if (chatMessages.length > 20) {
        chatMessages = chatMessages.slice(-20);
    }
    
    try {
        localStorage.setItem('tournament-chat', JSON.stringify(chatMessages));
    } catch (error) {
        console.warn('No se pudo guardar el mensaje:', error);
    }
    
    document.getElementById('chat-message-sidebar').value = '';
    loadChatSidebar();
    
    const chatContainer = document.getElementById('chat-messages-sidebar');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Guardar nombre del usuario
    localStorage.setItem('chat-user-name', name);
}

function loadChatSidebar() {
    const container = document.getElementById('chat-messages-sidebar');
    if (!container) return;
    
    if (chatMessages.length === 0) {
        container.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 1rem; font-size: 8px;">No hay mensajes aún.<br>¡Sé el primero en escribir!</div>';
        return;
    }
    
    container.innerHTML = chatMessages.map(msg => {
        const date = new Date(msg.timestamp);
        const timeString = date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="chat-message-sidebar">
                <div class="message-author-sidebar">${msg.author}</div>
                <div>${msg.message}</div>
                <div class="message-time-sidebar">${timeString}</div>
            </div>
        `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
}

function initializeChatSidebar() {
    loadChatSidebar();
    
    const savedName = localStorage.getItem('chat-user-name');
    const nameInput = document.getElementById('chat-name-sidebar');
    if (savedName && nameInput) {
        nameInput.value = savedName;
    }
}

// ===== GESTIÓN DE EQUIPOS =====
function handleTeamRegistration(e) {
    e.preventDefault();
    
    const teamName = document.getElementById('team-name').value.trim();
    const player1Name = document.getElementById('player1-name').value.trim();
    const player2Name = document.getElementById('player2-name').value.trim();
    
    if (!teamName || !player1Name || !player2Name) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }
    
    if (teams.find(team => team.name.toLowerCase() === teamName.toLowerCase())) {
        alert('Ya existe un equipo con ese nombre');
        return;
    }
    
    const photoType = document.querySelector('input[name="photo-type"]:checked').value;
    
    const newTeam = {
        id: Date.now(),
        name: teamName,
        players: [player1Name, player2Name],
        photoType: photoType,
        photos: {},
        stats: {
            played: 0,
            won: 0,
            lost: 0,
            points: 0
        },
        registrationDate: new Date().toISOString()
    };
    
    // Procesar fotos según el tipo seleccionado
    if (photoType === 'team') {
        const teamPhotoInput = document.getElementById('team-photo');
        if (teamPhotoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                newTeam.photos.team = e.target.result;
                saveTeamAndContinue(newTeam);
            };
            reader.readAsDataURL(teamPhotoInput.files[0]);
        } else {
            saveTeamAndContinue(newTeam);
        }
    } else {
        // Fotos individuales
        const player1PhotoInput = document.getElementById('player1-photo');
        const player2PhotoInput = document.getElementById('player2-photo');
        
        let photosProcessed = 0;
        const totalPhotos = (player1PhotoInput.files[0] ? 1 : 0) + (player2PhotoInput.files[0] ? 1 : 0);
        
        if (totalPhotos === 0) {
            saveTeamAndContinue(newTeam);
            return;
        }
        
        if (player1PhotoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                newTeam.photos.player1 = e.target.result;
                photosProcessed++;
                if (photosProcessed === totalPhotos) {
                    createTeamCollage(newTeam);
                }
            };
            reader.readAsDataURL(player1PhotoInput.files[0]);
        }
        
        if (player2PhotoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                newTeam.photos.player2 = e.target.result;
                photosProcessed++;
                if (photosProcessed === totalPhotos) {
                    createTeamCollage(newTeam);
                }
            };
            reader.readAsDataURL(player2PhotoInput.files[0]);
        }
    }
}

function saveTeamAndContinue(team) {
    teams.push(team);
    localStorage.setItem('tournament-teams', JSON.stringify(teams));
    
    document.getElementById('team-form').reset();
    
    // Resetear la vista de fotos
    document.getElementById('team-photo-upload').style.display = 'block';
    document.getElementById('individual-photos-upload').style.display = 'none';
    document.getElementById('team-photo-preview').innerHTML = '';
    document.getElementById('player1-photo-preview').innerHTML = '';
    document.getElementById('player2-photo-preview').innerHTML = '';
    
    loadTeams();
    updateTournamentInfo();
    updateTournamentControls();
    generateBrackets();
    updateLeaderboard();
    
    alert(`¡Equipo "${team.name}" registrado exitosamente!`);
}

function createTeamCollage(team) {
    // Crear un collage con las fotos individuales
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 100;
    
    let imagesLoaded = 0;
    const totalImages = (team.photos.player1 ? 1 : 0) + (team.photos.player2 ? 1 : 0);
    
    if (totalImages === 0) {
        saveTeamAndContinue(team);
        return;
    }
    
    function checkAllImagesLoaded() {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            team.photos.team = canvas.toDataURL();
            saveTeamAndContinue(team);
        }
    }
    
    if (team.photos.player1) {
        const img1 = new Image();
        img1.onload = function() {
            ctx.drawImage(img1, 0, 0, 100, 100);
            checkAllImagesLoaded();
        };
        img1.src = team.photos.player1;
    }
    
    if (team.photos.player2) {
        const img2 = new Image();
        img2.onload = function() {
            ctx.drawImage(img2, 100, 0, 100, 100);
            checkAllImagesLoaded();
        };
        img2.src = team.photos.player2;
    }
}

function handlePhotoTypeChange() {
    const photoType = document.querySelector('input[name="photo-type"]:checked').value;
    const teamPhotoUpload = document.getElementById('team-photo-upload');
    const individualPhotosUpload = document.getElementById('individual-photos-upload');
    
    if (photoType === 'team') {
        teamPhotoUpload.style.display = 'block';
        individualPhotosUpload.style.display = 'none';
    } else {
        teamPhotoUpload.style.display = 'none';
        individualPhotosUpload.style.display = 'block';
    }
}

function handlePhotoPreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 150px; max-height: 150px; border-radius: var(--border-radius); border: 2px solid var(--accent-color);">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function loadTeams() {
    const container = document.getElementById('registered-teams');
    if (!container) return;
    
    if (teams.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); opacity: 0.7;">No hay equipos registrados aún</p>';
        return;
    }
    
    const isActive = tournamentState === 'active';
    
    container.innerHTML = teams.map(team => {
        const photoDisplay = team.photos && team.photos.team 
            ? `<img src="${team.photos.team}" class="team-card-photo">`
            : '<div style="width: 60px; height: 60px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 30px;">🎮</div>';
        
        const editButton = isActive ? '' : `
            <button onclick="event.stopPropagation(); editTeam(${team.id})" class="btn-secondary" style="font-size: 8px; padding: 0.5rem;">
                ✏️ Editar
            </button>
        `;
            
        return `
            <div class="team-card" onclick="showTeamDetails(${team.id})">
                <div class="team-card-photo">
                    ${photoDisplay}
                </div>
                <div class="team-card-info">
                    <h4>${team.name}</h4>
                    <p>${team.players.join(' & ')}</p>
                    <p>Puntos: ${team.stats.points} | Partidas: ${team.stats.played}</p>
                </div>
                <div class="team-card-actions">
                    ${editButton}
                </div>
            </div>
        `;
    }).join('');
}

function showTeamDetails(teamId) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    const modal = document.getElementById('team-modal');
    const content = document.getElementById('team-profile-content');
    
    if (!modal || !content) return;
    
    const photoDisplay = team.photos && team.photos.team 
        ? `<img src="${team.photos.team}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-color);">`
        : '<div style="width: 120px; height: 120px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 60px; margin: 0 auto;">🎮</div>';
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            ${photoDisplay}
            <h2 style="color: var(--accent-color); margin: 1rem 0;">${team.name}</h2>
            <p style="color: var(--secondary-color); font-size: 12px;">${team.players.join(' & ')}</p>
        </div>
        
        <div class="team-stats">
            <h3 style="color: var(--secondary-color); margin-bottom: 1rem;">📊 Estadísticas</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div class="info-card">
                    <h3>Partidas Jugadas</h3>
                    <p>${team.stats.played}</p>
                </div>
                <div class="info-card">
                    <h3>Partidas Ganadas</h3>
                    <p style="color: var(--success-color);">${team.stats.won}</p>
                </div>
                <div class="info-card">
                    <h3>Partidas Perdidas</h3>
                    <p style="color: var(--danger-color);">${team.stats.lost}</p>
                </div>
                <div class="info-card">
                    <h3>Puntos Totales</h3>
                    <p style="color: var(--accent-color); font-weight: bold;">${team.stats.points}</p>
                </div>
            </div>
        </div>
        
        <div class="form-actions" style="margin-top: 2rem;">
            <button onclick="editTeam(${team.id})" class="btn-primary">
                ✏️ Editar Equipo
            </button>
            <button onclick="closeTeamModal()" class="btn-secondary">
                Cerrar
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function editTeam(teamId) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    const modal = document.getElementById('team-edit-modal') || createTeamEditModal();
    const content = document.getElementById('team-edit-content');
    
    content.innerHTML = `
        <h2>✏️ Editar Equipo</h2>
        
        <div class="form-group">
            <label for="edit-team-name">Nombre del Equipo</label>
            <input type="text" id="edit-team-name" value="${team.name}">
        </div>
        
        <div class="players-section">
            <h3>Jugadores</h3>
            <div class="form-group">
                <label for="edit-player1-name">Jugador 1</label>
                <input type="text" id="edit-player1-name" value="${team.players[0] || ''}">
            </div>
            <div class="form-group">
                <label for="edit-player2-name">Jugador 2</label>
                <input type="text" id="edit-player2-name" value="${team.players[1] || ''}">
            </div>
        </div>
        
        <div class="photo-section">
            <h3>Foto del Equipo</h3>
            <div class="current-photo" style="text-align: center; margin-bottom: 1rem;">
                ${team.photos && team.photos.team 
                    ? `<img src="${team.photos.team}" style="max-width: 150px; max-height: 150px; border-radius: var(--border-radius); border: 2px solid var(--accent-color);">`
                    : '<p style="opacity: 0.7;">No hay foto actual</p>'
                }
            </div>
            <div class="form-group">
                <label for="edit-team-photo">Cambiar Foto</label>
                <input type="file" id="edit-team-photo" accept="image/*" onchange="previewEditTeamPhoto(event)">
                <div id="edit-photo-preview"></div>
            </div>
        </div>
        
        <div class="form-actions">
            <button onclick="saveTeamChanges(${team.id})" class="btn-primary">
                Guardar Cambios
            </button>
            <button onclick="closeTeamEditModal()" class="btn-secondary">
                Cancelar
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function createTeamEditModal() {
    const modal = document.createElement('div');
    modal.id = 'team-edit-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeTeamEditModal()">&times;</span>
            <div id="team-edit-content"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function previewEditTeamPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('edit-photo-preview');
        preview.innerHTML = `
            <div style="text-align: center; margin-top: 1rem;">
                <p style="margin-bottom: 0.5rem; color: var(--accent-color);">Vista previa:</p>
                <img src="${e.target.result}" style="max-width: 150px; max-height: 150px; border-radius: var(--border-radius); border: 2px solid var(--accent-color);">
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

function saveTeamChanges(teamId) {
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) return;
    
    const name = document.getElementById('edit-team-name').value.trim();
    const player1 = document.getElementById('edit-player1-name').value.trim();
    const player2 = document.getElementById('edit-player2-name').value.trim();
    
    if (!name || !player1 || !player2) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    // Verificar que no haya otro equipo con el mismo nombre
    const existingTeam = teams.find(t => t.id !== teamId && t.name.toLowerCase() === name.toLowerCase());
    if (existingTeam) {
        alert('Ya existe un equipo con ese nombre');
        return;
    }
    
    // Actualizar datos básicos
    teams[teamIndex].name = name;
    teams[teamIndex].players = [player1, player2];
    
    // Actualizar foto si se seleccionó una nueva
    const photoInput = document.getElementById('edit-team-photo');
    if (photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            teams[teamIndex].photos = teams[teamIndex].photos || {};
            teams[teamIndex].photos.team = e.target.result;
            
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
            loadTeams();
            closeTeamEditModal();
            closeTeamModal();
            
            alert('¡Equipo actualizado exitosamente!');
        };
        reader.readAsDataURL(photoInput.files[0]);
    } else {
        localStorage.setItem('tournament-teams', JSON.stringify(teams));
        loadTeams();
        closeTeamEditModal();
        closeTeamModal();
        
        alert('¡Equipo actualizado exitosamente!');
    }
}

function closeTeamModal() {
    const modal = document.getElementById('team-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeTeamEditModal() {
    const modal = document.getElementById('team-edit-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===== GESTIÓN DE JUEGOS ALEATORIOS =====
function initializeGameQueue() {
    if (games.length === 0) return;
    
    // Crear una cola con todos los juegos repetidos según el número de partidas estimadas
    const estimatedMatches = Math.max(teams.length * 2, 10);
    gameQueue = [];
    
    // Repetir todos los juegos hasta tener suficientes para todas las partidas
    while (gameQueue.length < estimatedMatches) {
        const shuffledGames = [...games].sort(() => Math.random() - 0.5);
        gameQueue.push(...shuffledGames);
    }
    
    // Mezclar la cola final
    gameQueue = gameQueue.sort(() => Math.random() - 0.5);
    currentGameIndex = 0;
    
    localStorage.setItem('tournament-game-queue', JSON.stringify(gameQueue));
    localStorage.setItem('tournament-current-game-index', currentGameIndex.toString());
    
    console.log('🎮 Cola de juegos inicializada:', gameQueue.length, 'juegos en cola');
}

function getNextGame() {
    if (gameQueue.length === 0) {
        initializeGameQueue();
    }
    
    if (currentGameIndex >= gameQueue.length) {
        // Si llegamos al final, reiniciar con una nueva mezcla
        initializeGameQueue();
    }
    
    const nextGame = gameQueue[currentGameIndex];
    currentGameIndex++;
    localStorage.setItem('tournament-current-game-index', currentGameIndex.toString());
    
    console.log('🎯 Siguiente juego:', nextGame.name);
    return nextGame;
}

function resetGameQueue() {
    gameQueue = [];
    currentGameIndex = 0;
    localStorage.removeItem('tournament-game-queue');
    localStorage.removeItem('tournament-current-game-index');
    initializeGameQueue();
}
// ===== GESTIÓN DE JUEGOS =====
const gameIcons = [
    '🎮', '🕹️', '👾', '🎯', '🏎️', '👊', '⚡', '🎲', '🥊', '⚔️',
    '🏹', '🛡️', '🎪', '🎨', '🎭', '🎪', '🎳', '🎱', '🏓', '🏸',
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥅', '🏆', '🥇'
];

function handleGameAddition(e) {
    e.preventDefault();
    
    const gameName = document.getElementById('game-name').value.trim();
    
    if (!gameName) {
        alert('Por favor ingresa el nombre del juego');
        return;
    }
    
    if (games.find(game => game.name.toLowerCase() === gameName.toLowerCase())) {
        alert('Este juego ya está en la lista');
        return;
    }
    
    // Abrir modal para configurar el juego
    showGameConfigModal(gameName);
}

function showGameConfigModal(gameName, existingGame = null) {
    const modal = document.getElementById('game-modal') || createGameModal();
    const content = document.getElementById('game-modal-content');
    
    const isEditing = !!existingGame;
    const game = existingGame || { name: gameName, emoji: '🎮', rules: '' };
    
    content.innerHTML = `
        <h2>${isEditing ? '✏️ Editar Juego' : '🎮 Configurar Nuevo Juego'}</h2>
        
        <div class="form-group">
            <label for="game-name-modal">Nombre del Juego</label>
            <input type="text" id="game-name-modal" value="${game.name}" ${isEditing ? 'readonly' : ''}>
        </div>
        
        <div class="icon-selection">
            <label>Selecciona un Icono</label>
            <div class="icons-grid">
                ${gameIcons.map(icon => `
                    <div class="icon-option ${game.emoji === icon ? 'selected' : ''}" 
                         onclick="selectGameIcon('${icon}')">${icon}</div>
                `).join('')}
            </div>
        </div>
        
        <div class="custom-icon-section">
            <label for="custom-game-icon">O sube una imagen personalizada</label>
            <input type="file" id="custom-game-icon" accept="image/*" onchange="handleCustomGameIcon(event)">
            <div id="custom-game-icon-preview"></div>
        </div>
        
        <div class="selected-icon-preview">
            <div class="selected-icon" id="selected-game-icon">${game.emoji}</div>
        </div>
        
        <div class="form-group">
            <label for="game-rules-modal">Reglas del Juego</label>
            <textarea id="game-rules-modal" rows="4" placeholder="Describe las reglas básicas del juego...">${game.rules || ''}</textarea>
        </div>
        
        <div class="form-actions">
            <button onclick="saveGameConfig(${isEditing ? game.id : 'null'})" class="btn-primary">
                ${isEditing ? 'Guardar Cambios' : 'Agregar Juego'}
            </button>
            <button onclick="closeGameModal()" class="btn-secondary">Cancelar</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function createGameModal() {
    const modal = document.createElement('div');
    modal.id = 'game-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeGameModal()">&times;</span>
            <div id="game-modal-content"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function selectGameIcon(icon) {
    document.querySelectorAll('.icon-option').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
    document.getElementById('selected-game-icon').textContent = icon;
    
    // Limpiar imagen personalizada si se selecciona un emoji
    document.getElementById('custom-game-icon-preview').innerHTML = '';
    document.getElementById('custom-game-icon').value = '';
}

function handleCustomGameIcon(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('custom-game-icon-preview');
        preview.innerHTML = `<img src="${e.target.result}" style="max-width: 60px; max-height: 60px; border-radius: 50%; border: 2px solid var(--accent-color);">`;
        
        // Actualizar el icono seleccionado
        const selectedIcon = document.getElementById('selected-game-icon');
        selectedIcon.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        
        // Deseleccionar emojis
        document.querySelectorAll('.icon-option').forEach(el => el.classList.remove('selected'));
    };
    reader.readAsDataURL(file);
}

function saveGameConfig(gameId) {
    const name = document.getElementById('game-name-modal').value.trim();
    const rules = document.getElementById('game-rules-modal').value.trim();
    
    if (!name) {
        alert('Por favor ingresa el nombre del juego');
        return;
    }
    
    // Obtener el icono seleccionado
    let emoji = '🎮';
    const selectedIconEl = document.querySelector('.icon-option.selected');
    const customIconImg = document.querySelector('#custom-game-icon-preview img');
    
    if (customIconImg) {
        emoji = customIconImg.src; // Usar la imagen personalizada
    } else if (selectedIconEl) {
        emoji = selectedIconEl.textContent;
    }
    
    if (gameId) {
        // Editar juego existente
        const gameIndex = games.findIndex(g => g.id === gameId);
        if (gameIndex !== -1) {
            games[gameIndex] = { ...games[gameIndex], name, emoji, rules };
        }
    } else {
        // Agregar nuevo juego
        const newGame = {
            id: Date.now(),
            name,
            emoji,
            rules: rules || 'Reglas estándar del juego.'
        };
        games.push(newGame);
    }
    
    localStorage.setItem('tournament-games', JSON.stringify(games));
    resetGameQueue(); // Reinicializar la cola con los nuevos juegos
    
    document.getElementById('game-name').value = '';
    loadGames();
    closeGameModal();
    
    alert(`¡Juego "${name}" ${gameId ? 'actualizado' : 'agregado'} exitosamente!`);
}

function closeGameModal() {
    const modal = document.getElementById('game-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function loadGames() {
    const container = document.getElementById('games-grid');
    if (!container) return;
    
    const isActive = tournamentState === 'active';
    
    if (games.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); opacity: 0.7;">No hay juegos registrados</p>';
        return;
    }
    
    let gamesToShow = games;
    
    if (isActive) {
        // Durante el torneo, mostrar solo el juego actual y los ya jugados
        const currentRound = getCurrentRound();
        
        gamesToShow = games.filter((game, index) => {
            const gameRound = index + 1;
            return gameRound <= currentRound;
        });
        
        if (gamesToShow.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--accent-color);">🎮 Los juegos aparecerán según avance el torneo</p>';
            return;
        }
    }
    
    container.innerHTML = gamesToShow.map((game, index) => {
        const gameRound = index + 1;
        const isCurrentGame = isActive && gameRound === getCurrentRound();
        const isPlayedGame = isActive && gameRound < getCurrentRound();
        
        let statusBadge = '';
        if (isActive) {
            if (isCurrentGame) {
                statusBadge = '<div style="background: var(--accent-color); color: var(--bg-dark); padding: 0.3rem; border-radius: 10px; font-size: 8px; font-weight: bold; margin-top: 0.5rem;">🎯 RONDA ACTUAL</div>';
            } else if (isPlayedGame) {
                statusBadge = '<div style="background: var(--success-color); color: white; padding: 0.3rem; border-radius: 10px; font-size: 8px; margin-top: 0.5rem;">✅ COMPLETADO</div>';
            }
        }
        
        const editButtons = isActive ? '' : `
            <button onclick="event.stopPropagation(); editGame(${game.id})" class="btn-secondary" style="font-size: 8px; padding: 0.5rem;">
                ✏️ Editar
            </button>
            <button onclick="event.stopPropagation(); removeGame(${game.id})" class="btn-secondary" style="font-size: 8px; padding: 0.5rem; background: var(--danger-color);">
                🗑️ Eliminar
            </button>
        `;
        
        const iconDisplay = game.emoji.startsWith('data:') || game.emoji.startsWith('http') 
            ? `<img src="${game.emoji}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-color);">`
            : game.emoji;
            
        return `
            <div class="game-card ${isCurrentGame ? 'current-game' : ''}" onclick="showGameDetails(${game.id})">
                <div class="game-emoji">${iconDisplay}</div>
                <h3>${game.name}</h3>
                ${statusBadge}
                <div class="game-actions">
                    ${editButtons}
                </div>
            </div>
        `;
    }).join('');
}

function showGameDetails(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const modal = document.getElementById('game-details-modal') || createGameDetailsModal();
    const content = document.getElementById('game-details-content');
    
    const iconDisplay = game.emoji.startsWith('data:') || game.emoji.startsWith('http') 
        ? `<img src="${game.emoji}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-color);">`
        : `<div style="font-size: 80px;">${game.emoji}</div>`;
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            ${iconDisplay}
            <h2 style="color: var(--accent-color); margin: 1rem 0;">${game.name}</h2>
        </div>
        
        <div class="game-rules-section">
            <h3 style="color: var(--secondary-color); margin-bottom: 1rem;">📋 Reglas del Juego</h3>
            <div style="background: var(--bg-dark); padding: 1.5rem; border-radius: var(--border-radius); border: 2px solid var(--secondary-color);">
                <p style="line-height: 1.6; font-size: 10px;">
                    ${game.rules || 'No se han definido reglas específicas para este juego.'}
                </p>
            </div>
        </div>
        
        <div class="form-actions" style="margin-top: 2rem;">
            <button onclick="editGame(${game.id}); closeGameDetailsModal();" class="btn-primary">
                ✏️ Editar Juego
            </button>
            <button onclick="closeGameDetailsModal()" class="btn-secondary">
                Cerrar
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function createGameDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'game-details-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeGameDetailsModal()">&times;</span>
            <div id="game-details-content"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function closeGameDetailsModal() {
    const modal = document.getElementById('game-details-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function editGame(gameId) {
    const game = games.find(g => g.id === gameId);
    if (game) {
        showGameConfigModal(game.name, game);
    }
}

function removeGame(gameId) {
    if (confirm('¿Estás seguro de que quieres eliminar este juego?')) {
        games = games.filter(game => game.id !== gameId);
        localStorage.setItem('tournament-games', JSON.stringify(games));
        loadGames();
    }
}

// ===== CONTROLES DEL TORNEO =====
function startTournament() {
    if (teams.length < 2) {
        alert('⚠️ Necesitas al menos 2 equipos para comenzar el torneo');
        return;
    }
    
    const estimatedMatches = Math.floor(teams.length / 2) * games.length;
    const confirmMessage = `🚀 ¿Estás seguro de que quieres comenzar el torneo?

📊 Configuración:
• ${teams.length} equipos registrados
• ${games.length} juegos disponibles
• Aproximadamente ${estimatedMatches} partidas en total

Sistema Aleatorio:
Las partidas se asignarán aleatoriamente en cada ronda.
Cada juego tendrá diferentes enfrentamientos.

¿Continuar?`;
    
    if (confirm(confirmMessage)) {
        tournamentState = 'active';
        localStorage.setItem('tournament-state', tournamentState);
        
        // Reinicializar la cola de juegos para el torneo
        resetGameQueue();
        
        // Generar las partidas del torneo
        const success = generateTournamentMatches();
        if (!success) {
            // Si falla, revertir estado
            tournamentState = 'preparing';
            localStorage.setItem('tournament-state', tournamentState);
            return;
        }
        
        updateTournamentInfo();
        updateTournamentControls();
        generateBrackets();
        updateNextMatch();
        
        const actualMatches = matches.length;
        const distribution = showMatchDistribution();
        alert(`🎉 ¡Torneo iniciado exitosamente!

📈 Partidas generadas: ${actualMatches}
🎯 Distribución por ronda:
${distribution}

¡Que comience la batalla! 🏆`);
    }
}

function resetTournament() {
    if (confirm('🔄 ¿Estás seguro de que quieres reiniciar el torneo?\n\nEsto eliminará todas las partidas y reiniciará las estadísticas.')) {
        tournamentState = 'preparing';
        localStorage.setItem('tournament-state', tournamentState);
        
        matches = [];
        localStorage.removeItem('tournament-matches');
        
        // Reiniciar cola de juegos
        resetGameQueue();
        
        // Reiniciar estadísticas de equipos
        teams.forEach(team => {
            team.stats = {
                played: 0,
                won: 0,
                lost: 0,
                points: 0
            };
        });
        localStorage.setItem('tournament-teams', JSON.stringify(teams));
        
        updateTournamentInfo();
        updateTournamentControls();
        loadTeams();
        generateBrackets();
        updateNextMatch();
        updateLeaderboard();
        
        alert('✅ Torneo reiniciado correctamente\n\n💡 Las próximas partidas se asignarán aleatoriamente cuando inicies el torneo.');
    }
}

function generateTournamentMatches() {
    matches = []; // Limpiar partidas existentes
    
    console.log('🎯 Generando partidas con asignación aleatoria...');
    console.log('📊 Equipos:', teams.length, 'Juegos:', games.length);
    
    if (teams.length < 2 || games.length === 0) {
        console.error('❌ No hay suficientes equipos o juegos');
        return;
    }
    
    let matchId = Date.now();
    let roundNumber = 1;
    
    // Para cada juego, crear partidas aleatorias
    games.forEach(game => {
        console.log(`🎮 Creando ronda ${roundNumber} para ${game.name}`);
        
        // Crear una copia de los equipos para mezclar
        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
        
        // Calcular número de partidas por juego basado en equipos disponibles
        const matchesPerGame = Math.floor(teams.length / 2);
        
        console.log(`  📈 Generando ${matchesPerGame} partidas para ${game.name}`);
        
        // Generar partidas emparejando equipos aleatoriamente
        for (let i = 0; i < matchesPerGame; i++) {
            const team1Index = i * 2;
            const team2Index = (i * 2) + 1;
            
            if (team1Index < shuffledTeams.length && team2Index < shuffledTeams.length) {
                const match = {
                    id: matchId++,
                    round: roundNumber,
                    team1Id: shuffledTeams[team1Index].id, // Solo guardar ID, no objeto completo
                    team2Id: shuffledTeams[team2Index].id, // Solo guardar ID, no objeto completo
                    gameId: game.id, // Solo guardar ID, no objeto completo
                    completed: false,
                    winnerId: null
                };
                matches.push(match);
                console.log(`  ⚔️ ${shuffledTeams[team1Index].name} vs ${shuffledTeams[team2Index].name} en ${game.name}`);
            }
        }
        
        // Si hay un número impar de equipos, el último equipo pasa automáticamente
        if (teams.length % 2 !== 0 && roundNumber === 1) {
            const byeTeam = shuffledTeams[shuffledTeams.length - 1];
            console.log(`  🎯 ${byeTeam.name} pasa automáticamente en ${game.name}`);
            
            // Dar puntos de participación al equipo que pasa
            const teamInArray = teams.find(t => t.id === byeTeam.id);
            if (teamInArray) {
                teamInArray.stats.played++;
                teamInArray.stats.points += 1;
            }
        }
        
        roundNumber++;
    });
    
    // Guardar con manejo de errores
    try {
        localStorage.setItem('tournament-matches', JSON.stringify(matches));
        localStorage.setItem('tournament-teams', JSON.stringify(teams));
        console.log(`✅ ${matches.length} partidas generadas y guardadas`);
    } catch (error) {
        console.error('❌ Error guardando partidas:', error);
        alert('⚠️ Error: Demasiados datos para guardar. Reduce el número de equipos o juegos.');
        return false;
    }
    
    console.log(`📊 Promedio: ${Math.round(matches.length / games.length)} partidas por juego`);
    return true;
}

function updateNextMatch() {
    const container = document.getElementById('next-match-info');
    if (!container) return;
    
    // Buscar la próxima partida sin completar
    const nextMatchRaw = matches.find(match => !match.completed);
    
    if (!nextMatchRaw) {
        if (matches.length === 0) {
            container.innerHTML = '<p>Registra equipos para comenzar el torneo</p>';
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <h4 style="color: var(--success-color); margin-bottom: 1rem;">🏆 ¡Torneo Completado!</h4>
                    <p>Todas las partidas han sido jugadas</p>
                    <p style="margin-top: 1rem; font-size: 10px;">Revisa la clasificación final</p>
                </div>
            `;
        }
        return;
    }
    
    const nextMatch = getMatchWithObjects(nextMatchRaw);
    
    const gameIcon = nextMatch.game.emoji.startsWith('data:') || nextMatch.game.emoji.startsWith('http') 
        ? `<img src="${nextMatch.game.emoji}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">`
        : nextMatch.game.emoji;
    
    container.innerHTML = `
        <div style="background: var(--bg-medium); padding: 1.5rem; border-radius: var(--border-radius); border: 2px solid var(--accent-color);">
            <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="text-align: center;">
                    <strong>${nextMatch.team1.name}</strong><br>
                    <small>${nextMatch.team1.players.join(' & ')}</small>
                </div>
                <div style="font-size: 20px;">VS</div>
                <div style="text-align: center;">
                    <strong>${nextMatch.team2.name}</strong><br>
                    <small>${nextMatch.team2.players.join(' & ')}</small>
                </div>
            </div>
            
            <div style="text-align: center; margin: 1rem 0;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <span style="font-size: 24px;">${gameIcon}</span>
                    <strong style="color: var(--accent-color);">${nextMatch.game.name}</strong>
                </div>
                ${nextMatch.game.rules ? `<p style="font-size: 9px; margin-top: 0.5rem; opacity: 0.8;">${nextMatch.game.rules}</p>` : ''}
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
                <button onclick="declareWinner(${nextMatch.id}, ${nextMatch.team1.id})" class="btn-primary" style="font-size: 9px; padding: 0.5rem 1rem;">
                    🏆 ${nextMatch.team1.name} Gana
                </button>
                <button onclick="declareWinner(${nextMatch.id}, ${nextMatch.team2.id})" class="btn-primary" style="font-size: 9px; padding: 0.5rem 1rem;">
                    🏆 ${nextMatch.team2.name} Gana
                </button>
            </div>
        </div>
    `;
}

function declareWinner(matchId, winnerId) {
    const match = matches.find(m => m.id === matchId);
    if (!match || match.completed) return;
    
    // Obtener objetos completos para trabajar
    const matchWithObjects = getMatchWithObjects(match);
    const winner = getTeamById(winnerId);
    const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id;
    const loser = getTeamById(loserId);
    
    if (!winner || !loser) {
        console.error('Error: No se encontraron los equipos');
        return;
    }
    
    // Marcar partida como completada
    match.completed = true;
    match.winnerId = winnerId;
    match.completedAt = new Date().toISOString();
    
    // Actualizar estadísticas
    const winnerTeam = teams.find(t => t.id === winner.id);
    const loserTeam = teams.find(t => t.id === loser.id);
    
    if (winnerTeam) {
        winnerTeam.stats.played++;
        winnerTeam.stats.won++;
        winnerTeam.stats.points += 3; // 3 puntos por victoria
    }
    
    if (loserTeam) {
        loserTeam.stats.played++;
        loserTeam.stats.lost++;
        loserTeam.stats.points += 1; // 1 punto por participación
    }
    
    // Guardar cambios con manejo de errores
    try {
        localStorage.setItem('tournament-matches', JSON.stringify(matches));
        localStorage.setItem('tournament-teams', JSON.stringify(teams));
    } catch (error) {
        console.error('Error guardando resultado:', error);
        alert('⚠️ Error guardando el resultado. Intenta de nuevo.');
        return;
    }
    
    // Actualizar interfaz
    updateNextMatch();
    updateLeaderboard();
    generateBrackets();
    
    // Mostrar mensaje de victoria
    alert(`🎉 ¡${winner.name} gana la partida de ${matchWithObjects.game.name}!`);
    
    console.log(`🏆 ${winner.name} venció a ${loser.name} en ${matchWithObjects.game.name}`);
    
    // Verificar si el torneo ha terminado
    const remainingMatches = matches.filter(m => !m.completed);
    if (remainingMatches.length === 0) {
        setTimeout(() => {
            alert('🎉 ¡Torneo completado! Revisa la clasificación final.');
            tournamentState = 'finished';
            localStorage.setItem('tournament-state', tournamentState);
            updateTournamentControls();
        }, 1000);
    }
}

function checkStorageQuota() {
    try {
        const testKey = 'storage-test';
        const testData = 'x'.repeat(1024); // 1KB de datos
        localStorage.setItem(testKey, testData);
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        console.warn('⚠️ localStorage está cerca del límite');
        return false;
    }
}

function optimizeStorageOld() {
    if (confirm('🧹 ¿Limpiar y optimizar datos?')) {
        try {
            // Limpiar mensajes de chat antiguos
            if (chatMessages.length > 10) {
                chatMessages = chatMessages.slice(-10);
                localStorage.setItem('tournament-chat', JSON.stringify(chatMessages));
            }
            
            // Limpiar chat antiguo (mantener solo los últimos 50 mensajes)
            if (chatMessages.length > 50) {
                chatMessages = chatMessages.slice(-50);
                localStorage.setItem('tournament-chat', JSON.stringify(chatMessages));
            }
            
            // Limpiar partidas completadas antiguas si hay muchas
            if (matches.length > 100) {
                const recentMatches = matches.slice(-50);
                matches = recentMatches;
                localStorage.setItem('tournament-matches', JSON.stringify(matches));
            }
            
            loadTeams();
            loadChatSidebar();
            
            alert('✅ Datos optimizados correctamente');
            
        } catch (error) {
            console.error('Error optimizando:', error);
            alert('⚠️ Error durante la optimización.');
        }
    }
}

function emergencyCleanup() {
    if (confirm('🚨 LIMPIEZA DE EMERGENCIA 🚨\n\n⚠️ ESTO BORRARÁ TODOS LOS DATOS')) {
        try {
            localStorage.clear();
            location.reload();
        } catch (error) {
            console.error('Error en limpieza de emergencia:', error);
        }
    }
}

// ===== INFORMACIÓN DEL TORNEO =====
function updateTournamentInfo() {
    const teamsCountEl = document.getElementById('teams-count');
    const matchesPlayedEl = document.getElementById('matches-played');
    const tournamentStatusEl = document.getElementById('tournament-status');
    
    if (teamsCountEl) teamsCountEl.textContent = teams.length;
    if (matchesPlayedEl) matchesPlayedEl.textContent = matches.filter(m => m.completed).length;
    
    let status = '';
    switch(tournamentState) {
        case 'preparing':
            const estimatedMatches = teams.length >= 2 ? Math.floor(teams.length / 2) * games.length : 0;
            status = teams.length < 2 ? '⏳ Esperando equipos...' : `✅ Listo (≈${estimatedMatches} partidas)`;
            break;
        case 'active':
            const completedMatches = matches.filter(m => m.completed).length;
            const totalMatches = matches.length;
            const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
            status = `🚀 En progreso (${progress}% - ${completedMatches}/${totalMatches})`;
            break;
        case 'finished':
            status = '🏆 Torneo finalizado';
            break;
        default:
            status = '⏳ Preparando...';
    }
    
    if (tournamentStatusEl) {
        tournamentStatusEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <span>${status}</span>
                ${tournamentState === 'preparing' && teams.length >= 2 ? `
                    <div style="font-size: 8px; opacity: 0.7; background: rgba(255, 204, 2, 0.1); padding: 0.3rem; border-radius: 4px;">
                        Sistema aleatorio: Cada juego tendrá partidas diferentes
                    </div>
                ` : ''}
            </div>
        `;
    }
}

function updateTournamentControls() {
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const finalizeBtn = document.getElementById('finalize-btn');
    
    // Controlar formularios según estado del torneo
    updateFormVisibility();
    
    if (!startBtn || !resetBtn || !finalizeBtn) return;
    
    switch(tournamentState) {
        case 'preparing':
            startBtn.style.display = 'inline-block';
            startBtn.disabled = teams.length < 2 || games.length === 0;
            
            if (teams.length < 2) {
                startBtn.textContent = `⚠️ Necesitas al menos 2 equipos (${teams.length}/2)`;
            } else if (games.length === 0) {
                startBtn.textContent = '⚠️ Necesitas al menos 1 juego';
            } else {
                startBtn.textContent = `🚀 Comenzar Torneo (${teams.length} equipos, ${games.length} juegos)`;
            }
            
            resetBtn.style.display = 'inline-block';
            finalizeBtn.style.display = 'none';
            break;
            
        case 'active':
            startBtn.style.display = 'none';
            resetBtn.style.display = 'inline-block';
            finalizeBtn.style.display = 'inline-block';
            break;
            
        case 'finished':
            startBtn.style.display = 'none';
            resetBtn.style.display = 'inline-block';
            finalizeBtn.style.display = 'none';
            break;
    }
}

function updateFormVisibility() {
    const registrationForm = document.querySelector('#registro .registration-form');
    const gameForm = document.querySelector('#juegos .game-form');
    
    if (registrationForm) {
        if (tournamentState === 'active') {
            registrationForm.style.display = 'none';
        } else {
            registrationForm.style.display = 'block';
        }
    }
    
    if (gameForm) {
        if (tournamentState === 'active') {
            gameForm.style.display = 'none';
        } else {
            gameForm.style.display = 'block';
        }
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    const teamForm = document.getElementById('team-form');
    if (teamForm) {
        teamForm.addEventListener('submit', handleTeamRegistration);
    }

    const gameForm = document.getElementById('game-form');
    if (gameForm) {
        gameForm.addEventListener('submit', handleGameAddition);
    }

    const chatFormSidebar = document.getElementById('chat-form-sidebar');
    if (chatFormSidebar) {
        chatFormSidebar.addEventListener('submit', handleChatMessageSidebar);
    }

    const chatNameSidebar = document.getElementById('chat-name-sidebar');
    if (chatNameSidebar) {
        chatNameSidebar.addEventListener('blur', function() {
            localStorage.setItem('chat-user-name', this.value);
        });
    }
}

// ===== FUNCIONES TEMPORALES =====
function generateBrackets() {
    const container = document.getElementById('bracket-container');
    if (!container) return;
    
    console.log('🏆 Generando brackets. Equipos disponibles:', teams.length);
    console.log('🎯 Estado del torneo:', tournamentState);
    
    if (teams.length < 2) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3>🎮 Registra al menos 2 equipos para generar los brackets</h3>
                <p style="margin-top: 1rem; opacity: 0.8;">Los brackets se generarán automáticamente cuando tengas suficientes equipos</p>
                <p style="margin-top: 0.5rem; font-size: 10px; color: var(--secondary-color);">Equipos actuales: ${teams.length}</p>
            </div>
        `;
        return;
    }
    
    if (tournamentState !== 'active') {
        // Antes de iniciar el torneo, solo mostrar equipos registrados
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3>🏆 Equipos Registrados</h3>
                <p style="margin-bottom: 2rem; opacity: 0.8;">Equipos listos: ${teams.length}</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0;">
                    ${teams.map(team => {
                        const teamPhoto = team.photos && team.photos.team 
                            ? `<img src="${team.photos.team}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-color);">`
                            : '<div style="width: 60px; height: 60px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto;">🎮</div>';
                        
                        return `
                            <div style="background: var(--bg-medium); padding: 1.5rem; border-radius: var(--border-radius); border: 2px solid var(--secondary-color); text-align: center;">
                                ${teamPhoto}
                                <h4 style="color: var(--accent-color); margin: 1rem 0 0.5rem 0;">${team.name}</h4>
                                <p style="font-size: 10px; opacity: 0.8;">${team.players.join(' & ')}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div style="background: var(--bg-dark); padding: 1rem; border-radius: var(--border-radius); margin-top: 2rem;">
                    <p style="color: var(--secondary-color);">⏳ Haz clic en "Comenzar Torneo" para iniciar las partidas</p>
                    <p style="font-size: 10px; opacity: 0.6; margin-top: 0.5rem;">Se generarán aproximadamente ${teams.length >= 2 ? Math.floor(teams.length / 2) * games.length : 0} partidas en total</p>
                    <p style="font-size: 9px; opacity: 0.5; margin-top: 0.3rem;">Las partidas se asignarán aleatoriamente en cada ronda</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Torneo activo - mostrar brackets reales
    const currentRound = getCurrentRound();
    const roundMatches = matches.filter(m => m.round === currentRound).map(m => getMatchWithObjects(m));
    const completedMatches = matches.filter(m => m.completed).length;
    const totalMatches = matches.length;
    
    let html = `
        <div style="text-align: center; padding: 2rem;">
            <h3>🏆 Torneo en Progreso</h3>
            <p style="margin-bottom: 1rem; opacity: 0.8;">Ronda ${currentRound} - ${roundMatches[0]?.game?.name || 'Cargando...'}</p>
            <p style="font-size: 10px; margin-bottom: 2rem; color: var(--accent-color);">Partidas completadas: ${completedMatches}/${totalMatches}</p>
            
            <div class="bracket-round">
                <h3>Ronda ${currentRound}: ${roundMatches[0]?.game?.name || ''}</h3>
                <div class="bracket-matches">
    `;
    
    roundMatches.forEach(match => {
        const team1Photo = match.team1.photos && match.team1.photos.team 
            ? `<img src="${match.team1.photos.team}" class="team-photo" alt="${match.team1.name}">`
            : '<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 20px;">🎮</div>';
            
        const team2Photo = match.team2.photos && match.team2.photos.team 
            ? `<img src="${match.team2.photos.team}" class="team-photo" alt="${match.team2.name}">`
            : '<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--secondary-color); display: flex; align-items: center; justify-content: center; font-size: 20px;">🎮</div>';
        
        const gameIcon = match.game.emoji.startsWith('data:') || match.game.emoji.startsWith('http') 
            ? `<img src="${match.game.emoji}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">`
            : match.game.emoji;
        
        const matchClass = match.completed ? 'bracket-match match-winner' : 'bracket-match';
        const statusText = match.completed 
            ? `🏆 ${match.winner.name} ganó`
            : `🎮 Por jugar`;
        
        html += `
            <div class="${matchClass}">
                <div class="match-team">
                    ${team1Photo}
                    <div>
                        <strong>${match.team1.name}</strong><br>
                        <small>${match.team1.players.join(' & ')}</small>
                    </div>
                </div>
                <div class="match-vs">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                        <span>VS</span>
                        <div style="display: flex; align-items: center; gap: 0.3rem; font-size: 8px;">
                            ${gameIcon}
                            <span>${match.game.name}</span>
                        </div>
                    </div>
                </div>
                <div class="match-team">
                    ${team2Photo}
                    <div>
                        <strong>${match.team2.name}</strong><br>
                        <small>${match.team2.players.join(' & ')}</small>
                    </div>
                </div>
            </div>
            <div style="text-align: center; margin: 0.5rem 0; font-size: 10px; color: var(--accent-color);">
                ${statusText}
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    // Mostrar progreso del torneo
    const roundsCompleted = Math.max(...matches.map(m => m.round)) - currentRound;
    html += `
        <div style="text-align: center; margin-top: 2rem; padding: 1rem; background: var(--bg-dark); border-radius: var(--border-radius);">
            <p style="color: var(--accent-color);">🚀 Torneo en progreso</p>
            <p style="font-size: 10px; opacity: 0.8;">Ronda ${currentRound} de ${games.length}</p>
        </div>
    `;
    
    container.innerHTML = html;
}

function getCurrentRound() {
    // Encontrar la ronda actual basada en las partidas no completadas
    const incompleteMatches = matches.filter(m => !m.completed);
    if (incompleteMatches.length === 0) {
        return Math.max(...matches.map(m => m.round));
    }
    return Math.min(...incompleteMatches.map(m => m.round));
}

function updateLeaderboard() {
    const container = document.getElementById('leaderboard');
    if (!container) return;
    
    console.log('📊 Actualizando clasificación. Equipos disponibles:', teams.length);
    
    if (teams.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: var(--text-light); opacity: 0.7;">No hay equipos registrados</p>
                <p style="font-size: 10px; margin-top: 1rem;">Ve a la sección "Registro" para agregar equipos</p>
            </div>
        `;
        return;
    }
    
    const sortedTeams = [...teams].sort((a, b) => {
        if (b.stats.points !== a.stats.points) {
            return b.stats.points - a.stats.points;
        }
        return b.stats.won - a.stats.won;
    });
    
    let html = `
        <div style="margin-bottom: 1rem; text-align: center;">
            <p style="color: var(--accent-color); font-size: 12px;">📊 Clasificación General (${teams.length} equipos)</p>
        </div>
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Posición</th>
                    <th>Equipo</th>
                    <th>Jugadores</th>
                    <th>Partidas</th>
                    <th>Ganadas</th>
                    <th>Perdidas</th>
                    <th>Puntos</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sortedTeams.forEach((team, index) => {
        const position = index + 1;
        let positionEmoji = '';
        let positionClass = '';
        
        if (position === 1) {
            positionEmoji = '🥇';
            positionClass = 'position-1';
        } else if (position === 2) {
            positionEmoji = '🥈';
            positionClass = 'position-2';
        } else if (position === 3) {
            positionEmoji = '🥉';
            positionClass = 'position-3';
        }
        
        html += `
            <tr class="${positionClass}">
                <td>${positionEmoji} ${position}</td>
                <td><strong>${team.name}</strong></td>
                <td>${team.players.join(' & ')}</td>
                <td>${team.stats.played}</td>
                <td style="color: var(--success-color);">${team.stats.won}</td>
                <td style="color: var(--danger-color);">${team.stats.lost}</td>
                <td><strong>${team.stats.points}</strong></td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        
        <div style="text-align: center; margin-top: 2rem; padding: 1rem; background: var(--bg-dark); border-radius: var(--border-radius);">
            <p style="font-size: 10px; opacity: 0.8; margin-bottom: 1rem;">
                <strong>Sistema de puntos:</strong> 3 puntos por victoria, 1 punto por participación
            </p>
            <button onclick="resetLeaderboard()" class="btn-secondary" style="font-size: 9px; padding: 0.5rem 1rem;">
                🔄 Reiniciar Clasificación
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

function showMatchDistribution() {
    if (matches.length === 0) return '';
    
    const matchesByRound = {};
    matches.forEach(match => {
        if (!matchesByRound[match.round]) {
            matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
    });
    
    let distributionText = '';
    Object.keys(matchesByRound).forEach(round => {
        const roundMatches = matchesByRound[round];
        const game = getGameById(roundMatches[0]?.gameId);
        const gameName = game?.name || 'Desconocido';
        distributionText += `Ronda ${round} (${gameName}): ${roundMatches.length} partidas\n`;
    });
    
    return distributionText;
}

function resetLeaderboard() {
    if (confirm('🔄 ¿Estás seguro de que quieres reiniciar la clasificación?\n\nEsto pondrá todos los puntos y estadísticas en 0.')) {
        teams.forEach(team => {
            team.stats = {
                played: 0,
                won: 0,
                lost: 0,
                points: 0
            };
        });
        
        localStorage.setItem('tournament-teams', JSON.stringify(teams));
        
        updateLeaderboard();
        loadTeams();
        
        alert('✅ Clasificación reiniciada correctamente');
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Inicializando aplicación...');
    console.log('📊 Equipos en localStorage:', localStorage.getItem('tournament-teams'));
    
    try {
        initializeApp();
        setupEventListeners();
        loadGames();
        loadTeams();
        initializeChatSidebar();
        updateTournamentInfo();
        updateTournamentControls();
        
        // Forzar actualización de brackets y clasificación
        setTimeout(() => {
            console.log('🔄 Actualizando brackets y clasificación...');
            console.log('📊 Equipos disponibles:', teams.length);
            generateBrackets();
            updateLeaderboard();
            updateNextMatch();
        }, 100);
        
        console.log('✅ Aplicación inicializada correctamente');
        console.log('📊 Estado final - Equipos:', teams.length, 'Juegos:', games.length);
    } catch (error) {
        console.error('❌ Error al inicializar:', error);
        alert('Error al cargar la aplicación. Revisa la consola para más detalles.');
    }
});

console.log('🎮 Archivo JavaScript cargado correctamente - FINAL DEL ARCHIVO');
console.log('📋 Funciones disponibles:', {
    showSection: typeof showSection,
    startTournament: typeof startTournament,
    handleChatMessageSidebar: typeof handleChatMessageSidebar
});
