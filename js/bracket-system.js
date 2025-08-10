console.log('🏆 SISTEMA DE BRACKET DE DOBLE ELIMINACIÓN CARGADO');

// ===== ESTRUCTURA DEL BRACKET DE DOBLE ELIMINACIÓN =====

class DoubleEliminationBracket {
    constructor(teams, games) {
        this.teams = teams;
        this.games = games;
        this.gameQueue = [...games]; // Cola de juegos disponibles
        this.usedGames = []; // Juegos ya usados en esta ronda
        
        // Estructura del bracket
        this.winnersBracket = [];
        this.losersBracket = [];
        this.grandFinals = null;
        this.grandFinalsReset = null; // Si el ganador de losers gana la primera grand final
        
        // Estado del torneo
        this.currentPhase = 'winners'; // 'winners', 'losers', 'grand-finals', 'completed'
        this.matchIdCounter = 1;
        
        this.generateBracket();
    }
    
    // Generar el bracket completo
    generateBracket() {
        const teamCount = this.teams.length;
        
        if (teamCount < 2) {
            throw new Error('Se necesitan al menos 2 equipos para el bracket');
        }
        
        // Calcular rondas necesarias
        const winnersRounds = Math.ceil(Math.log2(teamCount));
        const losersRounds = (winnersRounds - 1) * 2;
        
        console.log(`📊 Generando bracket para ${teamCount} equipos:`);
        console.log(`   Winners Bracket: ${winnersRounds} rondas`);
        console.log(`   Losers Bracket: ${losersRounds} rondas`);
        
        this.generateWinnersBracket(teamCount, winnersRounds);
        this.generateLosersBracket(winnersRounds);
        this.generateGrandFinals();
        
        console.log('✅ Bracket generado exitosamente');
    }
    
    // Generar bracket de ganadores
    generateWinnersBracket(teamCount, rounds) {
        // Shuffle teams para distribución aleatoria
        const shuffledTeams = [...this.teams].sort(() => Math.random() - 0.5);
        
        // Primera ronda del winners bracket
        const firstRoundMatches = [];
        const teamsPerMatch = 2;
        
        for (let i = 0; i < shuffledTeams.length; i += teamsPerMatch) {
            if (i + 1 < shuffledTeams.length) {
                const match = {
                    id: this.matchIdCounter++,
                    bracket: 'winners',
                    round: 1,
                    team1: shuffledTeams[i],
                    team2: shuffledTeams[i + 1],
                    winner: null,
                    loser: null,
                    game: this.getNextGame(),
                    completed: false,
                    nextMatchId: null, // Se calculará después
                    loserNextMatchId: null // Para el losers bracket
                };
                firstRoundMatches.push(match);
            }
        }
        
        this.winnersBracket.push(firstRoundMatches);
        
        // Generar rondas subsecuentes del winners bracket
        for (let round = 2; round <= rounds; round++) {
            const roundMatches = [];
            const previousRoundMatches = this.winnersBracket[round - 2];
            
            for (let i = 0; i < previousRoundMatches.length; i += 2) {
                if (i + 1 < previousRoundMatches.length) {
                    const match = {
                        id: this.matchIdCounter++,
                        bracket: 'winners',
                        round: round,
                        team1: null, // Se llenará con el ganador de previousRoundMatches[i]
                        team2: null, // Se llenará con el ganador de previousRoundMatches[i + 1]
                        winner: null,
                        loser: null,
                        game: this.getNextGame(),
                        completed: false,
                        nextMatchId: null,
                        loserNextMatchId: null,
                        dependsOn: [previousRoundMatches[i].id, previousRoundMatches[i + 1].id]
                    };
                    roundMatches.push(match);
                    
                    // Conectar matches anteriores con este
                    previousRoundMatches[i].nextMatchId = match.id;
                    previousRoundMatches[i + 1].nextMatchId = match.id;
                }
            }
            
            if (roundMatches.length > 0) {
                this.winnersBracket.push(roundMatches);
            }
        }
    }
    
    // Generar bracket de perdedores
    generateLosersBracket(winnersRounds) {
        // El losers bracket es más complejo, alternando entre:
        // 1. Matches de perdedores del winners bracket
        // 2. Matches entre sobrevivientes del losers bracket
        
        let losersRound = 1;
        
        // Primera ronda de losers: perdedores de la primera ronda de winners
        const firstWinnersRound = this.winnersBracket[0];
        const firstLosersRoundMatches = [];
        
        for (let i = 0; i < firstWinnersRound.length; i += 2) {
            if (i + 1 < firstWinnersRound.length) {
                const match = {
                    id: this.matchIdCounter++,
                    bracket: 'losers',
                    round: losersRound,
                    team1: null, // Perdedor de firstWinnersRound[i]
                    team2: null, // Perdedor de firstWinnersRound[i + 1]
                    winner: null,
                    loser: null, // Eliminado del torneo
                    game: this.getNextGame(),
                    completed: false,
                    nextMatchId: null,
                    dependsOn: [firstWinnersRound[i].id, firstWinnersRound[i + 1].id],
                    dependsOnLosers: true
                };
                firstLosersRoundMatches.push(match);
                
                // Conectar winners matches con losers matches
                firstWinnersRound[i].loserNextMatchId = match.id;
                firstWinnersRound[i + 1].loserNextMatchId = match.id;
            }
        }
        
        if (firstLosersRoundMatches.length > 0) {
            this.losersBracket.push(firstLosersRoundMatches);
            losersRound++;
        }
        
        // Continuar generando rondas de losers bracket
        // Esta es una implementación simplificada - en un torneo real sería más complejo
        for (let winnersRoundIndex = 1; winnersRoundIndex < this.winnersBracket.length; winnersRoundIndex++) {
            const winnersRound = this.winnersBracket[winnersRoundIndex];
            const losersRoundMatches = [];
            
            // Cada perdedor del winners bracket entra al losers bracket
            winnersRound.forEach(winnersMatch => {
                const match = {
                    id: this.matchIdCounter++,
                    bracket: 'losers',
                    round: losersRound,
                    team1: null, // Se llenará dinámicamente
                    team2: null, // Se llenará dinámicamente
                    winner: null,
                    loser: null,
                    game: this.getNextGame(),
                    completed: false,
                    nextMatchId: null,
                    dependsOn: [winnersMatch.id],
                    dependsOnLosers: true
                };
                losersRoundMatches.push(match);
                winnersMatch.loserNextMatchId = match.id;
            });
            
            if (losersRoundMatches.length > 0) {
                this.losersBracket.push(losersRoundMatches);
                losersRound++;
            }
        }
    }
    
    // Generar Grand Finals
    generateGrandFinals() {
        this.grandFinals = {
            id: this.matchIdCounter++,
            bracket: 'grand-finals',
            round: 1,
            team1: null, // Ganador del winners bracket
            team2: null, // Ganador del losers bracket
            winner: null,
            loser: null,
            game: this.getNextGame(),
            completed: false,
            isGrandFinals: true
        };
        
        // Grand Finals Reset (si el ganador de losers gana la primera)
        this.grandFinalsReset = {
            id: this.matchIdCounter++,
            bracket: 'grand-finals-reset',
            round: 2,
            team1: null, // Ganador del winners bracket (segunda oportunidad)
            team2: null, // Ganador de la primera grand final
            winner: null,
            loser: null,
            game: this.getNextGame(),
            completed: false,
            isGrandFinalsReset: true,
            dependsOn: [this.grandFinals.id]
        };
    }
    
    // Obtener siguiente juego de la cola
    getNextGame() {
        if (this.gameQueue.length === 0) {
            // Reiniciar cola cuando se agoten los juegos
            this.gameQueue = [...this.games];
            this.usedGames = [];
            console.log('🔄 Cola de juegos reiniciada');
        }
        
        const gameIndex = Math.floor(Math.random() * this.gameQueue.length);
        const selectedGame = this.gameQueue.splice(gameIndex, 1)[0];
        this.usedGames.push(selectedGame);
        
        console.log(`🎮 Juego asignado: ${selectedGame.name}`);
        return selectedGame;
    }
    
    // Obtener todas las partidas en orden de ejecución
    getAllMatches() {
        const allMatches = [];
        
        // Winners bracket matches
        this.winnersBracket.forEach((round, roundIndex) => {
            round.forEach(match => {
                allMatches.push({...match, displayRound: `W${roundIndex + 1}`});
            });
        });
        
        // Losers bracket matches
        this.losersBracket.forEach((round, roundIndex) => {
            round.forEach(match => {
                allMatches.push({...match, displayRound: `L${roundIndex + 1}`});
            });
        });
        
        // Grand Finals
        if (this.grandFinals) {
            allMatches.push({...this.grandFinals, displayRound: 'GF'});
        }
        
        if (this.grandFinalsReset) {
            allMatches.push({...this.grandFinalsReset, displayRound: 'GF Reset'});
        }
        
        return allMatches;
    }
    
    // Obtener próxima partida disponible
    getNextAvailableMatch() {
        const allMatches = this.getAllMatches();
        
        return allMatches.find(match => {
            if (match.completed) return false;
            
            // Verificar si las dependencias están completadas
            if (match.dependsOn) {
                const dependencies = allMatches.filter(m => match.dependsOn.includes(m.id));
                return dependencies.every(dep => dep.completed);
            }
            
            // Si no tiene dependencias, verificar si tiene equipos asignados
            return match.team1 && match.team2;
        });
    }
    
    // Procesar resultado de una partida
    processMatchResult(matchId, winnerId) {
        const allMatches = this.getAllMatches();
        const match = allMatches.find(m => m.id === matchId);
        
        if (!match || match.completed) {
            console.error('Match no encontrado o ya completado');
            return false;
        }
        
        // Determinar ganador y perdedor
        const winner = match.team1.id === winnerId ? match.team1 : match.team2;
        const loser = match.team1.id === winnerId ? match.team2 : match.team1;
        
        match.winner = winner;
        match.loser = loser;
        match.completed = true;
        
        console.log(`🏆 ${winner.name} vence a ${loser.name} en ${match.game.name}`);
        
        // Actualizar estadísticas
        this.updateTeamStats(winner, loser);
        
        // Avanzar equipos en el bracket
        this.advanceTeams(match);
        
        return true;
    }
    
    // Avanzar equipos después de una partida
    advanceTeams(completedMatch) {
        const allMatches = this.getAllMatches();
        
        // Avanzar ganador
        if (completedMatch.nextMatchId) {
            const nextMatch = allMatches.find(m => m.id === completedMatch.nextMatchId);
            if (nextMatch) {
                if (!nextMatch.team1) {
                    nextMatch.team1 = completedMatch.winner;
                } else if (!nextMatch.team2) {
                    nextMatch.team2 = completedMatch.winner;
                }
            }
        }
        
        // Avanzar perdedor (si aplica)
        if (completedMatch.loserNextMatchId) {
            const loserMatch = allMatches.find(m => m.id === completedMatch.loserNextMatchId);
            if (loserMatch) {
                if (!loserMatch.team1) {
                    loserMatch.team1 = completedMatch.loser;
                } else if (!loserMatch.team2) {
                    loserMatch.team2 = completedMatch.loser;
                }
            }
        }
        
        // Verificar si es grand finals
        if (completedMatch.isGrandFinals) {
            // Si el ganador viene del winners bracket, gana el torneo
            // Si el ganador viene del losers bracket, se activa grand finals reset
            this.handleGrandFinalsResult(completedMatch);
        }
    }
    
    // Manejar resultado de Grand Finals
    handleGrandFinalsResult(grandFinalsMatch) {
        // Implementar lógica específica de grand finals
        if (grandFinalsMatch.winner) {
            // Determinar si necesita reset o si termina el torneo
            console.log(`🎉 Posible campeón: ${grandFinalsMatch.winner.name}`);
        }
    }
    
    // Actualizar estadísticas de equipos
    updateTeamStats(winner, loser) {
        // Encontrar equipos en el array principal y actualizar stats
        const winnerTeam = this.teams.find(t => t.id === winner.id);
        const loserTeam = this.teams.find(t => t.id === loser.id);
        
        if (winnerTeam) {
            winnerTeam.stats.played++;
            winnerTeam.stats.won++;
            winnerTeam.stats.points += 3;
        }
        
        if (loserTeam) {
            loserTeam.stats.played++;
            loserTeam.stats.lost++;
            loserTeam.stats.points += 1;
        }
    }
    
    // Obtener estado del torneo
    getTournamentStatus() {
        const allMatches = this.getAllMatches();
        const completedMatches = allMatches.filter(m => m.completed);
        const totalMatches = allMatches.length;
        
        return {
            phase: this.currentPhase,
            completedMatches: completedMatches.length,
            totalMatches: totalMatches,
            progress: Math.round((completedMatches.length / totalMatches) * 100),
            nextMatch: this.getNextAvailableMatch()
        };
    }
}

// Exportar para uso global
window.DoubleEliminationBracket = DoubleEliminationBracket;

console.log('✅ Sistema de bracket de doble eliminación listo');
