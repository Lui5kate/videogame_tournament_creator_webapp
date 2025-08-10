console.log('🎨 VISUALIZADOR DE BRACKET CARGADO');

// ===== VISUALIZADOR DEL BRACKET DE DOBLE ELIMINACIÓN =====

class BracketVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.bracket = null;
        
        if (!this.container) {
            console.error('Container no encontrado:', containerId);
            return;
        }
        
        this.setupStyles();
    }
    
    // Configurar estilos CSS para el bracket
    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .bracket-container {
                display: flex;
                flex-direction: column;
                gap: 2rem;
                padding: 1rem;
                background: var(--bg-dark);
                border-radius: var(--border-radius);
                overflow-x: auto;
                min-height: 600px;
            }
            
            .bracket-section {
                background: var(--bg-medium);
                border-radius: var(--border-radius);
                padding: 1rem;
                border: 2px solid var(--primary-color);
            }
            
            .bracket-title {
                color: var(--accent-color);
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 1rem;
                text-align: center;
                text-transform: uppercase;
            }
            
            .bracket-rounds {
                display: flex;
                gap: 2rem;
                align-items: flex-start;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .bracket-round {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                min-width: 200px;
            }
            
            .round-title {
                color: var(--secondary-color);
                font-size: 10px;
                text-align: center;
                font-weight: bold;
                margin-bottom: 0.5rem;
            }
            
            .match-card {
                background: var(--bg-dark);
                border: 2px solid var(--text-light);
                border-radius: var(--border-radius);
                padding: 0.8rem;
                position: relative;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .match-card:hover {
                border-color: var(--accent-color);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(255, 204, 2, 0.3);
            }
            
            .match-card.completed {
                border-color: var(--success-color);
            }
            
            .match-card.available {
                border-color: var(--accent-color);
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            .match-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .match-id {
                color: var(--text-light);
                font-size: 8px;
                opacity: 0.6;
            }
            
            .match-game {
                display: flex;
                align-items: center;
                gap: 0.3rem;
                font-size: 8px;
                color: var(--accent-color);
            }
            
            .game-emoji {
                font-size: 12px;
            }
            
            .match-teams {
                display: flex;
                flex-direction: column;
                gap: 0.3rem;
            }
            
            .team-slot {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.3rem 0.5rem;
                background: var(--bg-medium);
                border-radius: 4px;
                font-size: 9px;
                transition: all 0.2s ease;
            }
            
            .team-slot.winner {
                background: var(--success-color);
                color: var(--bg-dark);
                font-weight: bold;
            }
            
            .team-slot.loser {
                background: var(--danger-color);
                color: white;
                opacity: 0.7;
            }
            
            .team-slot.empty {
                background: var(--bg-light);
                color: var(--text-light);
                opacity: 0.5;
                font-style: italic;
            }
            
            .team-name {
                flex: 1;
                text-align: left;
            }
            
            .team-score {
                font-weight: bold;
                min-width: 20px;
                text-align: center;
            }
            
            .match-actions {
                margin-top: 0.5rem;
                display: flex;
                gap: 0.3rem;
            }
            
            .winner-btn {
                flex: 1;
                padding: 0.3rem;
                font-size: 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: var(--primary-color);
                color: white;
            }
            
            .winner-btn:hover {
                background: var(--secondary-color);
                transform: scale(1.05);
            }
            
            .winner-btn:disabled {
                background: var(--bg-light);
                color: var(--text-light);
                cursor: not-allowed;
                transform: none;
            }
            
            .grand-finals {
                background: linear-gradient(45deg, var(--primary-color), var(--accent-color));
                border: 3px solid var(--accent-color);
            }
            
            .grand-finals .match-card {
                background: rgba(0, 0, 0, 0.3);
                border-color: var(--accent-color);
            }
            
            .bracket-connections {
                position: relative;
                height: 20px;
                margin: 0.5rem 0;
            }
            
            .connection-line {
                position: absolute;
                background: var(--text-light);
                opacity: 0.3;
            }
            
            .connection-horizontal {
                height: 2px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .connection-vertical {
                width: 2px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            @media (max-width: 768px) {
                .bracket-rounds {
                    flex-direction: column;
                    align-items: center;
                }
                
                .bracket-round {
                    min-width: 100%;
                    max-width: 300px;
                }
                
                .match-card {
                    font-size: 8px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Renderizar el bracket completo
    render(bracket) {
        this.bracket = bracket;
        
        if (!bracket) {
            this.container.innerHTML = '<p>No hay bracket para mostrar</p>';
            return;
        }
        
        const status = bracket.getTournamentStatus();
        
        this.container.innerHTML = `
            <div class="bracket-container">
                ${this.renderTournamentStatus(status)}
                ${this.renderWinnersBracket(bracket.winnersBracket)}
                ${this.renderLosersBracket(bracket.losersBracket)}
                ${this.renderGrandFinals(bracket.grandFinals, bracket.grandFinalsReset)}
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    // Renderizar estado del torneo
    renderTournamentStatus(status) {
        return `
            <div class="bracket-section">
                <div class="bracket-title">📊 Estado del Torneo</div>
                <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div style="text-align: center;">
                        <div style="color: var(--accent-color); font-size: 18px; font-weight: bold;">${status.completedMatches}/${status.totalMatches}</div>
                        <div style="font-size: 8px; opacity: 0.8;">Partidas</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: var(--success-color); font-size: 18px; font-weight: bold;">${status.progress}%</div>
                        <div style="font-size: 8px; opacity: 0.8;">Progreso</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: var(--primary-color); font-size: 18px; font-weight: bold;">${status.phase.toUpperCase()}</div>
                        <div style="font-size: 8px; opacity: 0.8;">Fase</div>
                    </div>
                </div>
                ${status.nextMatch ? `
                    <div style="margin-top: 1rem; padding: 0.8rem; background: var(--bg-dark); border-radius: var(--border-radius); text-align: center;">
                        <div style="color: var(--accent-color); font-size: 10px; margin-bottom: 0.3rem;">🎯 PRÓXIMA PARTIDA</div>
                        <div style="font-size: 9px;">
                            <strong>${status.nextMatch.team1?.name || 'TBD'}</strong> vs <strong>${status.nextMatch.team2?.name || 'TBD'}</strong>
                        </div>
                        <div style="font-size: 8px; opacity: 0.7; margin-top: 0.2rem;">
                            ${status.nextMatch.game?.name} - ${status.nextMatch.displayRound}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Renderizar bracket de ganadores
    renderWinnersBracket(winnersBracket) {
        if (!winnersBracket || winnersBracket.length === 0) {
            return '';
        }
        
        return `
            <div class="bracket-section">
                <div class="bracket-title">🏆 Winners Bracket</div>
                <div class="bracket-rounds">
                    ${winnersBracket.map((round, roundIndex) => `
                        <div class="bracket-round">
                            <div class="round-title">Winners R${roundIndex + 1}</div>
                            ${round.map(match => this.renderMatch(match, `W${roundIndex + 1}`)).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Renderizar bracket de perdedores
    renderLosersBracket(losersBracket) {
        if (!losersBracket || losersBracket.length === 0) {
            return '';
        }
        
        return `
            <div class="bracket-section">
                <div class="bracket-title">💀 Losers Bracket</div>
                <div class="bracket-rounds">
                    ${losersBracket.map((round, roundIndex) => `
                        <div class="bracket-round">
                            <div class="round-title">Losers R${roundIndex + 1}</div>
                            ${round.map(match => this.renderMatch(match, `L${roundIndex + 1}`)).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Renderizar Grand Finals
    renderGrandFinals(grandFinals, grandFinalsReset) {
        if (!grandFinals) {
            return '';
        }
        
        return `
            <div class="bracket-section grand-finals">
                <div class="bracket-title">👑 Grand Finals</div>
                <div class="bracket-rounds">
                    <div class="bracket-round">
                        <div class="round-title">Grand Finals</div>
                        ${this.renderMatch(grandFinals, 'GF')}
                    </div>
                    ${grandFinalsReset ? `
                        <div class="bracket-round">
                            <div class="round-title">Grand Finals Reset</div>
                            ${this.renderMatch(grandFinalsReset, 'GF Reset')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Renderizar una partida individual
    renderMatch(match, displayRound) {
        const isAvailable = this.isMatchAvailable(match);
        const cardClass = match.completed ? 'completed' : (isAvailable ? 'available' : '');
        
        return `
            <div class="match-card ${cardClass}" data-match-id="${match.id}">
                <div class="match-header">
                    <span class="match-id">#${match.id}</span>
                    <div class="match-game">
                        <span class="game-emoji">${match.game?.emoji || '🎮'}</span>
                        <span>${match.game?.name || 'TBD'}</span>
                    </div>
                </div>
                
                <div class="match-teams">
                    ${this.renderTeamSlot(match.team1, match.winner, match.completed, 1)}
                    ${this.renderTeamSlot(match.team2, match.winner, match.completed, 2)}
                </div>
                
                ${!match.completed && isAvailable && match.team1 && match.team2 ? `
                    <div class="match-actions">
                        <button class="winner-btn" onclick="declareMatchWinner(${match.id}, ${match.team1.id})">
                            ${match.team1.name} Gana
                        </button>
                        <button class="winner-btn" onclick="declareMatchWinner(${match.id}, ${match.team2.id})">
                            ${match.team2.name} Gana
                        </button>
                    </div>
                ` : ''}
                
                ${match.completed ? `
                    <div style="text-align: center; margin-top: 0.5rem; font-size: 8px; color: var(--success-color);">
                        ✅ Completado
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Renderizar slot de equipo
    renderTeamSlot(team, winner, completed, slotNumber) {
        if (!team) {
            return `
                <div class="team-slot empty">
                    <span class="team-name">Esperando...</span>
                    <span class="team-score">-</span>
                </div>
            `;
        }
        
        let slotClass = '';
        if (completed && winner) {
            slotClass = winner.id === team.id ? 'winner' : 'loser';
        }
        
        return `
            <div class="team-slot ${slotClass}">
                <span class="team-name">${team.name}</span>
                <span class="team-score">${completed && winner && winner.id === team.id ? 'W' : (completed ? 'L' : '-')}</span>
            </div>
        `;
    }
    
    // Verificar si una partida está disponible para jugar
    isMatchAvailable(match) {
        if (match.completed || !match.team1 || !match.team2) {
            return false;
        }
        
        // Verificar dependencias
        if (match.dependsOn && this.bracket) {
            const allMatches = this.bracket.getAllMatches();
            const dependencies = allMatches.filter(m => match.dependsOn.includes(m.id));
            return dependencies.every(dep => dep.completed);
        }
        
        return true;
    }
    
    // Adjuntar event listeners
    attachEventListeners() {
        // Los event listeners se manejan a través de funciones globales
        // definidas en el archivo principal
    }
    
    // Actualizar bracket sin re-renderizar completamente
    update() {
        if (this.bracket) {
            this.render(this.bracket);
        }
    }
}

// Función global para declarar ganador
window.declareMatchWinner = function(matchId, winnerId) {
    if (window.currentBracket) {
        const success = window.currentBracket.processMatchResult(matchId, winnerId);
        if (success) {
            // Actualizar visualización
            if (window.bracketVisualizer) {
                window.bracketVisualizer.update();
            }
            
            // Guardar en localStorage
            saveBracketToStorage();
            
            // Actualizar otras secciones
            updateTournamentInfo();
            updateLeaderboard();
            
            console.log(`✅ Resultado procesado: Match ${matchId}, Ganador: ${winnerId}`);
        }
    }
};

// Exportar para uso global
window.BracketVisualizer = BracketVisualizer;

console.log('✅ Visualizador de bracket listo');
