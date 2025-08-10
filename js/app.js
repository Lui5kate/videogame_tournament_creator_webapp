console.log('TORNEO DE VIDEOJUEGOS - SISTEMA DE DOBLE ELIMINACION');
console.log('Version: Double Elimination Bracket - ' + new Date().toLocaleTimeString());

// ===== VARIABLES GLOBALES =====
let teams = JSON.parse(localStorage.getItem('tournament-teams')) || [];
let games = JSON.parse(localStorage.getItem('tournament-games')) || [
    { id: 1, name: 'Mario Kart', emoji: '🏎️', rules: 'Carrera de 4 vueltas. Gana el primero en llegar a la meta.' },
    { id: 2, name: 'Super Smash Bros', emoji: '👊', rules: 'Mejor de 3 rounds. Sin items. Escenarios neutrales.' },
    { id: 3, name: 'Marvel vs Capcom 3', emoji: '⚡', rules: 'Mejor de 5 rounds. Equipos de 3 personajes.' },
    { id: 4, name: 'Mario Party', emoji: '🎲', rules: '10 turnos. Gana quien tenga más estrellas al final.' },
    { id: 5, name: 'Street Fighter', emoji: '🥊', rules: 'Mejor de 5 rounds. Sin super meter inicial.' },
    { id: 6, name: 'Tekken 7', emoji: '🥋', rules: 'Mejor de 3 rounds. Sin rage arts iniciales.' },
    { id: 7, name: 'Rocket League', emoji: '⚽', rules: '5 minutos. Gana quien tenga más goles.' }
];

let chatMessages = JSON.parse(localStorage.getItem('tournament-chat')) || [];
let tournamentState = localStorage.getItem('tournament-state') || 'preparing';

// Variables del sistema de bracket
let currentBracket = null;
let bracketVisualizer = null;

// ===== FUNCIONES AUXILIARES =====
function getTeamById(id) {
    return teams.find(team => team.id === id);
}

function getGameById(id) {
    return games.find(game => game.id === id);
}

// ===== FUNCIONES BASICAS =====
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
    
    // Cargar bracket si existe
    loadBracketFromStorage();
    
    showSection('brackets');
}

// ===== GESTION DEL BRACKET =====
function loadBracketFromStorage() {
    try {
        const bracketData = localStorage.getItem('tournament-bracket');
        if (bracketData && teams.length > 0) {
            const data = JSON.parse(bracketData);
            // Reconstruir bracket desde datos guardados
            currentBracket = new DoubleEliminationBracket(teams, games);
            // Aplicar estado guardado
            restoreBracketState(currentBracket, data);
        }
    } catch (error) {
        console.error('Error cargando bracket:', error);
        currentBracket = null;
    }
}

function saveBracketToStorage() {
    if (currentBracket) {
        try {
            const bracketData = {
                winnersBracket: currentBracket.winnersBracket,
                losersBracket: currentBracket.losersBracket,
                grandFinals: currentBracket.grandFinals,
                grandFinalsReset: currentBracket.grandFinalsReset,
                currentPhase: currentBracket.currentPhase,
                gameQueue: currentBracket.gameQueue,
                usedGames: currentBracket.usedGames
            };
            localStorage.setItem('tournament-bracket', JSON.stringify(bracketData));
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
        } catch (error) {
            console.error('Error guardando bracket:', error);
        }
    }
}

function restoreBracketState(bracket, data) {
    // Restaurar estado del bracket desde localStorage
    if (data.winnersBracket) bracket.winnersBracket = data.winnersBracket;
    if (data.losersBracket) bracket.losersBracket = data.losersBracket;
    if (data.grandFinals) bracket.grandFinals = data.grandFinals;
    if (data.grandFinalsReset) bracket.grandFinalsReset = data.grandFinalsReset;
    if (data.currentPhase) bracket.currentPhase = data.currentPhase;
    if (data.gameQueue) bracket.gameQueue = data.gameQueue;
    if (data.usedGames) bracket.usedGames = data.usedGames;
}

function startTournament() {
    if (teams.length < 2) {
        alert('Necesitas al menos 2 equipos para comenzar el torneo');
        return;
    }
    
    // Calcular numero de partidas para bracket de doble eliminacion
    const teamCount = teams.length;
    const winnersRounds = Math.ceil(Math.log2(teamCount));
    const estimatedMatches = (teamCount - 1) + (teamCount - 2) + 1; // Aproximacion
    
    const confirmMessage = 'Iniciar Bracket de Doble Eliminacion?\n\n' +
        'Configuracion:\n' +
        '• ' + teamCount + ' equipos registrados\n' +
        '• ' + games.length + ' juegos disponibles\n' +
        '• Aproximadamente ' + estimatedMatches + ' partidas\n' +
        '• Sistema: Winners + Losers + Grand Finals\n\n' +
        'Caracteristicas:\n' +
        '• Perdedor en Winners -> Losers Bracket\n' +
        '• Perdedor en Losers -> Eliminado\n' +
        '• Juegos asignados aleatoriamente\n' +
        '• Sin repetir juegos hasta usar todos\n\n' +
        'Continuar?';
    
    if (confirm(confirmMessage)) {
        try {
            // Crear nuevo bracket
            currentBracket = new DoubleEliminationBracket(teams, games);
            
            // Cambiar estado del torneo
            tournamentState = 'active';
            localStorage.setItem('tournament-state', tournamentState);
            
            // Guardar bracket
            saveBracketToStorage();
            
            // Actualizar interfaz
            updateTournamentInfo();
            updateTournamentControls();
            generateBrackets();
            
            const actualMatches = currentBracket.getAllMatches().length;
            alert('Bracket de Doble Eliminacion Creado!\n\n' +
                'Partidas generadas: ' + actualMatches + '\n' +
                'Winners Bracket: ' + currentBracket.winnersBracket.length + ' rondas\n' +
                'Losers Bracket: ' + currentBracket.losersBracket.length + ' rondas\n' +
                'Grand Finals: Lista\n\n' +
                'Que comience la batalla!');
            
        } catch (error) {
            console.error('Error creando bracket:', error);
            alert('Error creando el bracket. Verifica que tengas suficientes equipos.');
        }
    }
}
function resetTournament() {
    if (confirm('Reiniciar Torneo Completo?\n\nEsto eliminara todo el bracket y reiniciara las estadisticas.')) {
        tournamentState = 'preparing';
        localStorage.setItem('tournament-state', tournamentState);
        
        // Limpiar bracket
        currentBracket = null;
        localStorage.removeItem('tournament-bracket');
        
        // Reiniciar estadisticas de equipos
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
        updateLeaderboard();
        
        alert('Torneo reiniciado correctamente\n\nListo para crear nuevo bracket de doble eliminacion.');
    }
}

// ===== GENERACION DE BRACKETS =====
function generateBrackets() {
    const container = document.getElementById('brackets');
    if (!container) return;
    
    if (tournamentState === 'preparing') {
        // Mostrar informacion pre-torneo
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h2 style="color: var(--accent-color); margin-bottom: 1rem;">Bracket de Doble Eliminacion</h2>
                
                <div style="background: var(--bg-medium); padding: 1.5rem; border-radius: var(--border-radius); margin-bottom: 2rem;">
                    <h3 style="color: var(--primary-color); margin-bottom: 1rem;">Como Funciona</h3>
                    <div style="text-align: left; max-width: 600px; margin: 0 auto;">
                        <p style="margin-bottom: 0.8rem;"><strong>Winners Bracket:</strong> Los equipos compiten normalmente. El perdedor pasa al Losers Bracket.</p>
                        <p style="margin-bottom: 0.8rem;"><strong>Losers Bracket:</strong> Segunda oportunidad. Si pierdes aqui, quedas eliminado.</p>
                        <p style="margin-bottom: 0.8rem;"><strong>Grand Finals:</strong> Ganador de Winners vs Ganador de Losers.</p>
                        <p style="margin-bottom: 0.8rem;"><strong>Juegos:</strong> Asignados aleatoriamente, sin repetir hasta usar todos.</p>
                    </div>
                </div>
                
                ${teams.length >= 2 ? `
                    <div style="background: var(--bg-dark); padding: 1rem; border-radius: var(--border-radius); margin-top: 2rem;">
                        <p style="color: var(--secondary-color);">Haz clic en "Comenzar Torneo" para generar el bracket</p>
                        <p style="font-size: 10px; opacity: 0.6; margin-top: 0.5rem;">
                            Con ${teams.length} equipos se generaran aproximadamente ${Math.ceil((teams.length - 1) + (teams.length - 2) + 1)} partidas
                        </p>
                        <p style="font-size: 9px; opacity: 0.5; margin-top: 0.3rem;">
                            Sistema de doble eliminacion con Winners, Losers y Grand Finals
                        </p>
                    </div>
                ` : `
                    <div style="background: var(--bg-dark); padding: 1rem; border-radius: var(--border-radius); margin-top: 2rem;">
                        <p style="color: var(--danger-color);">Necesitas al menos 2 equipos para crear el bracket</p>
                        <p style="font-size: 10px; margin-top: 0.5rem;">Ve a la seccion "Registro" para agregar equipos</p>
                    </div>
                `}
            </div>
        `;
        return;
    }
    
    // Mostrar bracket activo
    if (currentBracket) {
        if (!bracketVisualizer) {
            bracketVisualizer = new BracketVisualizer('brackets');
        }
        bracketVisualizer.render(currentBracket);
    } else {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3 style="color: var(--danger-color);">Error: Bracket no encontrado</h3>
                <p>Reinicia el torneo para crear un nuevo bracket</p>
            </div>
        `;
    }
}

// ===== INFORMACION DEL TORNEO =====
function updateTournamentInfo() {
    const teamsCountEl = document.getElementById('teams-count');
    const matchesPlayedEl = document.getElementById('matches-played');
    const tournamentStatusEl = document.getElementById('tournament-status');
    
    if (teamsCountEl) teamsCountEl.textContent = teams.length;
    
    let matchesPlayed = 0;
    let totalMatches = 0;
    let status = '';
    
    if (currentBracket) {
        const bracketStatus = currentBracket.getTournamentStatus();
        matchesPlayed = bracketStatus.completedMatches;
        totalMatches = bracketStatus.totalMatches;
        
        switch(tournamentState) {
            case 'preparing':
                status = teams.length < 2 ? 'Esperando equipos...' : 'Listo (' + totalMatches + ' partidas)';
                break;
            case 'active':
                status = 'ACTIVO ' + bracketStatus.phase.toUpperCase() + ' (' + bracketStatus.progress + '% - ' + matchesPlayed + '/' + totalMatches + ')';
                break;
            case 'finished':
                status = 'Torneo finalizado';
                break;
            default:
                status = 'Preparando...';
        }
    } else {
        switch(tournamentState) {
            case 'preparing':
                status = teams.length < 2 ? 'Esperando equipos...' : 'Listo para bracket';
                break;
            case 'active':
                status = 'Torneo activo';
                break;
            case 'finished':
                status = 'Torneo finalizado';
                break;
            default:
                status = 'Preparando...';
        }
    }
    
    if (matchesPlayedEl) matchesPlayedEl.textContent = matchesPlayed;
    
    if (tournamentStatusEl) {
        tournamentStatusEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <span>${status}</span>
                ${tournamentState === 'preparing' && teams.length >= 2 ? `
                    <div style="font-size: 8px; opacity: 0.7; background: rgba(255, 204, 2, 0.1); padding: 0.3rem; border-radius: 4px;">
                        Sistema de doble eliminacion listo
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
    
    // Controlar formularios segun estado del torneo
    updateFormVisibility();
    
    if (startBtn) {
        startBtn.style.display = tournamentState === 'preparing' ? 'inline-block' : 'none';
        startBtn.disabled = teams.length < 2;
    }
    
    if (resetBtn) {
        resetBtn.style.display = tournamentState !== 'preparing' ? 'inline-block' : 'none';
    }
    
    if (finalizeBtn) {
        finalizeBtn.style.display = 'none'; // No necesario en doble eliminacion
    }
}

function updateFormVisibility() {
    const forms = document.querySelectorAll('.tournament-form');
    forms.forEach(form => {
        if (tournamentState === 'active') {
            form.style.opacity = '0.5';
            form.style.pointerEvents = 'none';
        } else {
            form.style.opacity = '1';
            form.style.pointerEvents = 'auto';
        }
    });
}

// ===== GESTION DE EQUIPOS =====
function registerTeam() {
    const teamName = document.getElementById('team-name').value.trim();
    const player1 = document.getElementById('player1').value.trim();
    const player2 = document.getElementById('player2').value.trim();
    
    if (!teamName || !player1 || !player2) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }
    
    // Verificar que no exista un equipo con el mismo nombre
    if (teams.find(team => team.name.toLowerCase() === teamName.toLowerCase())) {
        alert('Ya existe un equipo con ese nombre');
        return;
    }
    
    const newTeam = {
        id: Date.now(),
        name: teamName,
        players: [player1, player2],
        stats: {
            played: 0,
            won: 0,
            lost: 0,
            points: 0
        },
        photos: {
            team: null,
            player1: null,
            player2: null
        }
    };
    
    // Manejar fotos si se subieron
    handleTeamPhotos(newTeam);
    
    teams.push(newTeam);
    localStorage.setItem('tournament-teams', JSON.stringify(teams));
    
    // Limpiar formulario
    document.getElementById('team-form').reset();
    
    // Actualizar interfaz
    loadTeams();
    updateTournamentInfo();
    generateBrackets();
    
    alert('Equipo "' + teamName + '" registrado exitosamente!');
}

function handleTeamPhotos(team) {
    const teamPhotoInput = document.getElementById('team-photo');
    const player1PhotoInput = document.getElementById('player1-photo');
    const player2PhotoInput = document.getElementById('player2-photo');
    
    if (teamPhotoInput && teamPhotoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            team.photos.team = e.target.result;
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
        };
        reader.readAsDataURL(teamPhotoInput.files[0]);
    }
    
    if (player1PhotoInput && player1PhotoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            team.photos.player1 = e.target.result;
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
        };
        reader.readAsDataURL(player1PhotoInput.files[0]);
    }
    
    if (player2PhotoInput && player2PhotoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            team.photos.player2 = e.target.result;
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
        };
        reader.readAsDataURL(player2PhotoInput.files[0]);
    }
}

function loadTeams() {
    const container = document.getElementById('teams-list');
    if (!container) return;
    
    if (teams.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; opacity: 0.7;">
                <p>No hay equipos registrados</p>
                <p style="font-size: 10px; margin-top: 1rem;">Usa el formulario de arriba para registrar equipos</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="margin-bottom: 1rem; text-align: center;">
            <p style="color: var(--accent-color); font-size: 12px;">Equipos Registrados (${teams.length})</p>
        </div>
        <div class="teams-grid">
    `;
    
    teams.forEach(team => {
        const teamPhoto = team.photos?.team || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5OIPC90ZXh0Pgo8L3N2Zz4=';
        
        html += `
            <div class="team-card">
                <div class="team-photo">
                    <img src="${teamPhoto}" alt="${team.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5OIPC90ZXh0Pgo8L3N2Zz4='">
                </div>
                <div class="team-info">
                    <h4>${team.name}</h4>
                    <p>${team.players.join(' & ')}</p>
                    <div class="team-stats">
                        <span>Partidas: ${team.stats.played}</span>
                        <span>Ganadas: ${team.stats.won}</span>
                        <span>Perdidas: ${team.stats.lost}</span>
                        <span>Puntos: ${team.stats.points}</span>
                    </div>
                </div>
                <button onclick="removeTeam(${team.id})" class="remove-btn" ${tournamentState === 'active' ? 'disabled' : ''}>
                    Eliminar
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function removeTeam(teamId) {
    if (tournamentState === 'active') {
        alert('No puedes eliminar equipos durante el torneo');
        return;
    }
    
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    if (confirm('Eliminar el equipo "' + team.name + '"?')) {
        teams = teams.filter(t => t.id !== teamId);
        localStorage.setItem('tournament-teams', JSON.stringify(teams));
        
        loadTeams();
        updateTournamentInfo();
        generateBrackets();
        
        alert('Equipo "' + team.name + '" eliminado');
    }
}

// ===== GESTION DE JUEGOS =====
function loadGames() {
    const container = document.getElementById('games-list');
    if (!container) return;
    
    let html = `
        <div style="margin-bottom: 1rem; text-align: center;">
            <p style="color: var(--accent-color); font-size: 12px;">Juegos Disponibles (${games.length})</p>
        </div>
        <div class="games-grid">
    `;
    
    games.forEach(game => {
        const isCustom = game.id > 1000; // IDs > 1000 son juegos personalizados
        
        html += `
            <div class="game-card">
                <div class="game-emoji">${game.emoji}</div>
                <div class="game-info">
                    <h4>${game.name}</h4>
                    ${game.rules ? `<p class="game-rules">${game.rules}</p>` : ''}
                </div>
                ${isCustom ? `
                    <button onclick="removeGame(${game.id})" class="remove-btn" ${tournamentState === 'active' ? 'disabled' : ''}>
                        Eliminar
                    </button>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function addGame() {
    const gameName = document.getElementById('game-name').value.trim();
    const gameEmoji = document.getElementById('game-emoji').value.trim();
    const gameRules = document.getElementById('game-rules').value.trim();
    
    if (!gameName) {
        alert('El nombre del juego es obligatorio');
        return;
    }
    
    // Verificar que no exista un juego con el mismo nombre
    if (games.find(game => game.name.toLowerCase() === gameName.toLowerCase())) {
        alert('Ya existe un juego con ese nombre');
        return;
    }
    
    const newGame = {
        id: Date.now() + 1000, // ID alto para juegos personalizados
        name: gameName,
        emoji: gameEmoji || 'GAME',
        rules: gameRules || ''
    };
    
    games.push(newGame);
    localStorage.setItem('tournament-games', JSON.stringify(games));
    
    // Limpiar formulario
    document.getElementById('game-form').reset();
    
    // Actualizar interfaz
    loadGames();
    
    alert('Juego "' + gameName + '" agregado exitosamente!');
}

function removeGame(gameId) {
    if (tournamentState === 'active') {
        alert('No puedes eliminar juegos durante el torneo');
        return;
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    if (confirm('Eliminar el juego "' + game.name + '"?')) {
        games = games.filter(g => g.id !== gameId);
        localStorage.setItem('tournament-games', JSON.stringify(games));
        
        loadGames();
        
        alert('Juego "' + game.name + '" eliminado');
    }
}

// ===== CLASIFICACION =====
function updateLeaderboard() {
    const container = document.getElementById('leaderboard');
    if (!container) return;
    
    console.log('Actualizando clasificacion. Equipos disponibles:', teams.length);
    
    if (teams.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: var(--text-light); opacity: 0.7;">No hay equipos registrados</p>
                <p style="font-size: 10px; margin-top: 1rem;">Ve a la seccion "Registro" para agregar equipos</p>
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
            <p style="color: var(--accent-color); font-size: 12px;">Clasificacion General (${teams.length} equipos)</p>
        </div>
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Posicion</th>
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
            positionEmoji = '1st';
            positionClass = 'position-1';
        } else if (position === 2) {
            positionEmoji = '2nd';
            positionClass = 'position-2';
        } else if (position === 3) {
            positionEmoji = '3rd';
            positionClass = 'position-3';
        } else {
            positionEmoji = position + 'th';
        }
        
        html += `
            <tr class="${positionClass}">
                <td>${positionEmoji}</td>
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
                <strong>Sistema de puntos:</strong> 3 puntos por victoria, 1 punto por participacion
            </p>
            <button onclick="resetLeaderboard()" class="btn-secondary" style="font-size: 9px; padding: 0.5rem 1rem;">
                Reiniciar Clasificacion
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

function resetLeaderboard() {
    if (confirm('Estas seguro de que quieres reiniciar la clasificacion?\n\nEsto pondra todos los puntos y estadisticas en 0.')) {
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
        
        alert('Clasificacion reiniciada correctamente');
    }
}

// ===== CHAT PRINCIPAL =====
function handleChatMessage(e) {
    e.preventDefault();
    
    const message = document.getElementById('chat-message').value.trim();
    const username = document.getElementById('chat-name').value.trim() || 'Anonimo';
    
    if (!message) return;
    
    const chatMessage = {
        id: Date.now(),
        username: username,
        message: message,
        timestamp: new Date().toLocaleTimeString()
    };
    
    chatMessages.push(chatMessage);
    localStorage.setItem('tournament-chat', JSON.stringify(chatMessages));
    
    document.getElementById('chat-message').value = '';
    
    loadChatMessages();
    loadChatSidebar(); // Actualizar sidebar también
}

function loadChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    if (chatMessages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; opacity: 0.5;">
                <p>No hay mensajes aun</p>
                <p style="font-size: 10px; margin-top: 1rem;">Se el primero en comentar!</p>
            </div>
        `;
        return;
    }
    
    const recentMessages = chatMessages.slice(-50); // Mostrar ultimos 50 mensajes
    
    let html = '';
    recentMessages.forEach(msg => {
        html += `
            <div class="chat-message">
                <div class="chat-header">
                    <span class="chat-username">${msg.username}</span>
                    <span class="chat-timestamp">${msg.timestamp}</span>
                </div>
                <div class="chat-content">${msg.message}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

// ===== CHAT SIDEBAR =====
function handleChatMessageSidebar(e) {
    e.preventDefault();
    
    const message = document.getElementById('chat-message-sidebar').value.trim();
    const username = document.getElementById('chat-name-sidebar').value.trim() || 'Anonimo';
    
    if (!message) return;
    
    const chatMessage = {
        id: Date.now(),
        username: username,
        message: message,
        timestamp: new Date().toLocaleTimeString()
    };
    
    chatMessages.push(chatMessage);
    localStorage.setItem('tournament-chat', JSON.stringify(chatMessages));
    
    document.getElementById('chat-message-sidebar').value = '';
    
    loadChatSidebar();
}

function loadChatSidebar() {
    const container = document.getElementById('chat-messages-sidebar');
    if (!container) return;
    
    if (chatMessages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 1rem; opacity: 0.5;">
                <p style="font-size: 10px;">No hay mensajes aun</p>
                <p style="font-size: 8px;">Se el primero en comentar!</p>
            </div>
        `;
        return;
    }
    
    const recentMessages = chatMessages.slice(-50); // Mostrar ultimos 50 mensajes
    
    let html = '';
    recentMessages.forEach(msg => {
        html += `
            <div class="chat-message">
                <div class="chat-header">
                    <span class="chat-username">${msg.username}</span>
                    <span class="chat-timestamp">${msg.timestamp}</span>
                </div>
                <div class="chat-content">${msg.message}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function initializeChatSidebar() {
    loadChatSidebar();
    loadChatMessages(); // Cargar chat principal también
    
    // Auto-refresh cada 5 segundos
    setInterval(() => {
        const currentMessages = JSON.parse(localStorage.getItem('tournament-chat')) || [];
        if (currentMessages.length !== chatMessages.length) {
            chatMessages = currentMessages;
            loadChatSidebar();
            loadChatMessages();
        }
    }, 5000);
}

// ===== FUNCIONES DE UTILIDAD =====
function setupEventListeners() {
    // Hamburger menu
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Chat form principal
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatMessage);
    }
    
    // Chat form sidebar
    const chatFormSidebar = document.getElementById('chat-form-sidebar');
    if (chatFormSidebar) {
        chatFormSidebar.addEventListener('submit', handleChatMessageSidebar);
    }
    
    // Team form
    const teamForm = document.getElementById('team-form');
    if (teamForm) {
        teamForm.addEventListener('submit', (e) => {
            e.preventDefault();
            registerTeam();
        });
    }
    
    // Game form
    const gameForm = document.getElementById('game-form');
    if (gameForm) {
        gameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addGame();
        });
    }
}

// ===== INICIALIZACION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando aplicacion de doble eliminacion...');
    console.log('Equipos en localStorage:', localStorage.getItem('tournament-teams'));
    
    try {
        initializeApp();
        setupEventListeners();
        loadGames();
        loadTeams();
        initializeChatSidebar();
        updateTournamentInfo();
        updateTournamentControls();
        
        // Forzar actualizacion de brackets y clasificacion
        setTimeout(() => {
            generateBrackets();
            updateLeaderboard();
        }, 100);
        
        console.log('Aplicacion inicializada correctamente');
        
    } catch (error) {
        console.error('Error durante la inicializacion:', error);
        alert('Error al cargar la aplicacion. Revisa la consola para mas detalles.');
    }
});

console.log('Sistema de Doble Eliminacion cargado correctamente - FINAL DEL ARCHIVO');
console.log('Funciones disponibles:', {
    showSection: typeof showSection,
    startTournament: typeof startTournament,
    handleChatMessageSidebar: typeof handleChatMessageSidebar,
    DoubleEliminationBracket: typeof window.DoubleEliminationBracket,
    BracketVisualizer: typeof window.BracketVisualizer
});
