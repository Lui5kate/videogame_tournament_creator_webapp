console.log('TORNEO DE VIDEOJUEGOS - SISTEMA UNIFICADO');

// ===== VARIABLES GLOBALES =====
let teams = JSON.parse(localStorage.getItem('tournament-teams')) || [];
let games = JSON.parse(localStorage.getItem('tournament-games')) || [];

let chatMessages = JSON.parse(localStorage.getItem('tournament-chat')) || [];
let tournamentState = localStorage.getItem('tournament-state') || 'preparing';
let currentBracket = null;
let bracketVisualizer = null;

// ===== CLASE BRACKET SYSTEM =====
class DoubleEliminationBracket {
    constructor(teams, games) {
        this.teams = teams;
        this.games = games;
        this.gameQueue = [...games];
        this.usedGames = [];
        this.winnersBracket = [];
        this.losersBracket = [];
        this.grandFinals = null;
        this.grandFinalsReset = null;
        this.currentPhase = 'winners';
        this.matchIdCounter = 1;
        this.generateBracket();
    }
    
    generateBracket() {
        const teamCount = this.teams.length;
        if (teamCount < 2) throw new Error('Se necesitan al menos 2 equipos');
        
        const winnersRounds = Math.ceil(Math.log2(teamCount));
        this.generateWinnersBracket(teamCount, winnersRounds);
        this.generateLosersBracket(winnersRounds);
        this.generateGrandFinals();
        
        // Conectar el último match de Winners con Grand Finals
        if (this.winnersBracket.length > 0) {
            const lastWinnersRound = this.winnersBracket[this.winnersBracket.length - 1];
            if (lastWinnersRound.length > 0) {
                const winnersFinalsMatch = lastWinnersRound[0];
                winnersFinalsMatch.nextMatchId = this.grandFinals.id;
                console.log(`🔗 Winners Finals (${winnersFinalsMatch.id}) conectado a Grand Finals (${this.grandFinals.id})`);
            }
        }
        
        // Conectar el último match de Losers con Grand Finals
        if (this.losersBracket.length > 0) {
            const lastLosersRound = this.losersBracket[this.losersBracket.length - 1];
            if (lastLosersRound.length > 0) {
                const losersFinalsMatch = lastLosersRound[lastLosersRound.length - 1];
                losersFinalsMatch.nextMatchId = this.grandFinals.id;
                console.log(`🔗 Losers Finals (${losersFinalsMatch.id}) conectado a Grand Finals (${this.grandFinals.id})`);
            }
        }
        
        console.log(`✅ Bracket generado: ${this.winnersBracket.length} rondas Winners, ${this.losersBracket.length} rondas Losers`);
        
        // Verificar auto-avances iniciales
        this.processInitialAutoAdvances();
    }
    
    // Procesar auto-avances que pueden ocurrir al inicio (equipos bye)
    processInitialAutoAdvances() {
        console.log('🔍 Verificando auto-avances iniciales...');
        
        // DESHABILITADO: No procesar auto-avances iniciales para evitar que bye llegue a Grand Finals
        // Solo permitir auto-avances manuales después de que se completen matches reales
        
        console.log('⏸️ Auto-avances iniciales deshabilitados para mantener integridad del torneo');
        
        // Pero SÍ asignar juegos a matches que ya tienen ambos equipos
        console.log('🎮 Asignando juegos a matches listos...');
        const gamesAssigned = this.checkAndAssignGames();
        if (gamesAssigned > 0) {
            console.log(`✅ ${gamesAssigned} juegos asignados inicialmente`);
        }
    }
    
    generateWinnersBracket(teamCount, rounds) {
        const shuffledTeams = [...this.teams].sort(() => Math.random() - 0.5);
        const firstRoundMatches = [];
        
        // Crear primera ronda del Winners Bracket
        for (let i = 0; i < shuffledTeams.length; i += 2) {
            if (i + 1 < shuffledTeams.length) {
                firstRoundMatches.push({
                    id: this.matchIdCounter++,
                    bracket: 'winners',
                    round: 1,
                    team1: shuffledTeams[i],
                    team2: shuffledTeams[i + 1],
                    winner: null,
                    loser: null,
                    game: null, // No asignar juego hasta que ambos equipos estén presentes
                    completed: false,
                    nextMatchId: null,
                    loserNextMatchId: null
                });
            }
        }
        
        this.winnersBracket.push(firstRoundMatches);
        
        // Crear rondas subsecuentes del Winners Bracket
        let currentTeamsCount = Math.floor(shuffledTeams.length / 2) + (shuffledTeams.length % 2);
        
        for (let round = 2; round <= rounds && currentTeamsCount > 1; round++) {
            const roundMatches = [];
            const previousRoundMatches = this.winnersBracket[round - 2];
            const teamsFromPreviousRound = previousRoundMatches.length;
            
            // Crear matches para ganadores de la ronda anterior
            for (let i = 0; i < teamsFromPreviousRound; i += 2) {
                if (i + 1 < teamsFromPreviousRound) {
                    const match = {
                        id: this.matchIdCounter++,
                        bracket: 'winners',
                        round: round,
                        team1: null, // Se llenará con ganador de previousRoundMatches[i]
                        team2: null, // Se llenará con ganador de previousRoundMatches[i + 1]
                        winner: null,
                        loser: null,
                        game: null, // No asignar juego hasta que ambos equipos estén presentes
                        completed: false,
                        nextMatchId: null,
                        loserNextMatchId: null,
                        dependsOn: [previousRoundMatches[i].id, previousRoundMatches[i + 1].id]
                    };
                    roundMatches.push(match);
                    
                    // Conectar matches anteriores con este match
                    previousRoundMatches[i].nextMatchId = match.id;
                    previousRoundMatches[i + 1].nextMatchId = match.id;
                }
            }
            
            // Manejar equipo bye solo en la segunda ronda
            if (round === 2 && shuffledTeams.length % 2 !== 0) {
                const byeTeam = shuffledTeams[shuffledTeams.length - 1];
                console.log(`🎯 ${byeTeam.name} tiene bye en Winners R1, esperará en Winners R2`);
                
                // Si hay un número impar de matches en la ronda anterior, el bye se enfrenta al último ganador
                if (teamsFromPreviousRound % 2 !== 0) {
                    const match = {
                        id: this.matchIdCounter++,
                        bracket: 'winners',
                        round: round,
                        team1: byeTeam, // Equipo que pasó automáticamente
                        team2: null, // Se llenará con ganador del último match de la ronda anterior
                        winner: null,
                        loser: null,
                        game: null, // No asignar juego hasta que ambos equipos estén presentes
                        completed: false,
                        nextMatchId: null,
                        loserNextMatchId: null,
                        dependsOn: [previousRoundMatches[previousRoundMatches.length - 1].id]
                    };
                    roundMatches.push(match);
                    previousRoundMatches[previousRoundMatches.length - 1].nextMatchId = match.id;
                }
            }
            
            if (roundMatches.length > 0) {
                this.winnersBracket.push(roundMatches);
                currentTeamsCount = Math.ceil(currentTeamsCount / 2);
            }
        }
        
        console.log(`✅ Winners Bracket: ${this.winnersBracket.length} rondas generadas`);
    }
    
    generateLosersBracket(winnersRounds) {
        if (this.winnersBracket.length === 0) return;
        
        console.log(`🔄 Generando Losers Bracket para ${winnersRounds} rondas de Winners`);
        
        // El Losers Bracket tiene una estructura específica:
        // - Rondas impares: perdedores de Winners compiten entre ellos
        // - Rondas pares: ganadores de ronda anterior vs nuevos perdedores de Winners
        
        let losersRoundNumber = 1;
        
        // RONDA 1 DE LOSERS: Perdedores de Winners R1 compiten entre ellos
        const firstWinnersRound = this.winnersBracket[0];
        if (firstWinnersRound.length > 1) {
            const losersR1Matches = [];
            
            // Emparejar perdedores de Winners R1
            for (let i = 0; i < firstWinnersRound.length; i += 2) {
                if (i + 1 < firstWinnersRound.length) {
                    const losersMatch = {
                        id: this.matchIdCounter++,
                        bracket: 'losers',
                        round: losersRoundNumber,
                        team1: null, // Perdedor de firstWinnersRound[i]
                        team2: null, // Perdedor de firstWinnersRound[i + 1]
                        winner: null,
                        loser: null,
                        game: null, // No asignar juego hasta que ambos equipos estén presentes
                        completed: false,
                        nextMatchId: null,
                        dependsOn: [firstWinnersRound[i].id, firstWinnersRound[i + 1].id],
                        dependsOnLosers: true
                    };
                    losersR1Matches.push(losersMatch);
                    
                    // Conectar Winners matches con este Losers match
                    firstWinnersRound[i].loserNextMatchId = losersMatch.id;
                    firstWinnersRound[i + 1].loserNextMatchId = losersMatch.id;
                }
            }
            
            // Si hay un número impar de perdedores, el último espera
            if (firstWinnersRound.length % 2 !== 0) {
                const waitingMatch = {
                    id: this.matchIdCounter++,
                    bracket: 'losers',
                    round: losersRoundNumber,
                    team1: null, // Perdedor del último match de Winners R1
                    team2: null, // Esperará al ganador de la siguiente ronda
                    winner: null,
                    loser: null,
                    game: null, // No asignar juego hasta que ambos equipos estén presentes
                    completed: false,
                    nextMatchId: null,
                    dependsOn: [firstWinnersRound[firstWinnersRound.length - 1].id],
                    dependsOnLosers: true,
                    isWaitingMatch: true
                };
                losersR1Matches.push(waitingMatch);
                firstWinnersRound[firstWinnersRound.length - 1].loserNextMatchId = waitingMatch.id;
            }
            
            this.losersBracket.push(losersR1Matches);
            losersRoundNumber++;
            console.log(`   L-R1: ${losersR1Matches.length} matches creados`);
        }
        
        // RONDAS SUBSECUENTES DEL LOSERS BRACKET
        for (let winnersRoundIndex = 1; winnersRoundIndex < this.winnersBracket.length; winnersRoundIndex++) {
            const winnersRound = this.winnersBracket[winnersRoundIndex];
            const previousLosersRound = this.losersBracket[this.losersBracket.length - 1];
            
            // RONDA PAR DE LOSERS: Ganadores de Losers anterior vs Perdedores de Winners actual
            const currentLosersRound = [];
            
            // Emparejar ganadores de la ronda anterior de Losers con perdedores de Winners
            const winnersLosers = winnersRound.length; // Número de perdedores que vendrán de Winners
            const losersWinners = previousLosersRound.length; // Número de ganadores de Losers anterior
            
            // Crear matches combinando ambos grupos
            const totalMatches = Math.max(winnersLosers, losersWinners);
            
            for (let i = 0; i < totalMatches; i++) {
                const losersMatch = {
                    id: this.matchIdCounter++,
                    bracket: 'losers',
                    round: losersRoundNumber,
                    team1: null, // Se llenará con ganador de Losers anterior o perdedor de Winners
                    team2: null, // Se llenará con el otro
                    winner: null,
                    loser: null,
                    game: null, // No asignar juego hasta que ambos equipos estén presentes
                    completed: false,
                    nextMatchId: null,
                    dependsOn: [],
                    dependsOnLosers: true
                };
                
                // Conectar con match de Winners correspondiente
                if (i < winnersRound.length) {
                    winnersRound[i].loserNextMatchId = losersMatch.id;
                    losersMatch.dependsOn.push(winnersRound[i].id);
                }
                
                // Conectar con match de Losers anterior correspondiente
                if (i < previousLosersRound.length) {
                    previousLosersRound[i].nextMatchId = losersMatch.id;
                    losersMatch.dependsOn.push(previousLosersRound[i].id);
                }
                
                currentLosersRound.push(losersMatch);
            }
            
            this.losersBracket.push(currentLosersRound);
            console.log(`   L-R${losersRoundNumber}: ${currentLosersRound.length} matches creados`);
            losersRoundNumber++;
            
            // Si hay más de un match en esta ronda de Losers, crear la siguiente ronda
            if (currentLosersRound.length > 1) {
                const nextLosersRound = [];
                
                // Emparejar ganadores de la ronda actual
                for (let i = 0; i < currentLosersRound.length; i += 2) {
                    if (i + 1 < currentLosersRound.length) {
                        const nextMatch = {
                            id: this.matchIdCounter++,
                            bracket: 'losers',
                            round: losersRoundNumber,
                            team1: null,
                            team2: null,
                            winner: null,
                            loser: null,
                            game: null, // No asignar juego hasta que ambos equipos estén presentes
                            completed: false,
                            nextMatchId: null,
                            dependsOn: [currentLosersRound[i].id, currentLosersRound[i + 1].id],
                            dependsOnLosers: true
                        };
                        nextLosersRound.push(nextMatch);
                        
                        currentLosersRound[i].nextMatchId = nextMatch.id;
                        currentLosersRound[i + 1].nextMatchId = nextMatch.id;
                    }
                }
                
                if (nextLosersRound.length > 0) {
                    this.losersBracket.push(nextLosersRound);
                    console.log(`   L-R${losersRoundNumber}: ${nextLosersRound.length} matches creados`);
                    losersRoundNumber++;
                }
            }
        }
        
        console.log(`✅ Losers Bracket completado: ${this.losersBracket.length} rondas`);
    }
    
    generateGrandFinals() {
        this.grandFinals = {
            id: this.matchIdCounter++,
            bracket: 'grand-finals',
            round: 1,
            team1: null, // Se llenará con el ganador de Winners
            team2: null, // Se llenará with el ganador de Losers
            winner: null,
            loser: null,
            game: null, // No asignar juego hasta que ambos equipos estén presentes
            completed: false,
            isGrandFinals: true,
            nextMatchId: null // Podría conectar a Grand Finals Reset
        };
        
        this.grandFinalsReset = {
            id: this.matchIdCounter++,
            bracket: 'grand-finals-reset',
            round: 2,
            team1: null, // Se llenará si es necesario
            team2: null, // Se llenará si es necesario
            winner: null,
            loser: null,
            game: null, // No asignar juego hasta que ambos equipos estén presentes
            completed: false,
            isGrandFinalsReset: true,
            dependsOn: [this.grandFinals.id]
        };
        
        // Conectar Grand Finals con Grand Finals Reset si es necesario
        this.grandFinals.nextMatchId = this.grandFinalsReset.id;
        
        console.log(`🏆 Grand Finals creado: Match ${this.grandFinals.id}`);
        console.log(`🔄 Grand Finals Reset creado: Match ${this.grandFinalsReset.id}`);
    }
    
    // Asignar juego a un match cuando ambos equipos estén presentes
    assignGameToMatch(match) {
        if (!match.game && match.team1 && match.team2) {
            console.log(`✅ Match ${match.id} listo para asignación de juego`);
            try {
                match.game = this.getNextGame();
                console.log(`🎮 Juego asignado al match ${match.id}: ${match.game.name} ${match.game.emoji}`);
                console.log(`   👥 ${match.team1.name} vs ${match.team2.name}`);
                return true;
            } catch (error) {
                console.error(`❌ Error asignando juego al match ${match.id}:`, error);
                return false;
            }
        } else if (!match.team1 || !match.team2) {
            // Solo log si es necesario para debugging
            // console.log(`⏳ Match ${match.id} esperando equipos: ${match.team1?.name || '❓'} vs ${match.team2?.name || '❓'}`);
        } else if (match.game) {
            // Solo log si es necesario para debugging
            // console.log(`✅ Match ${match.id} ya tiene juego asignado: ${match.game.name}`);
        }
        return false;
    }
    
    // Verificar y asignar juegos a matches que estén listos
    checkAndAssignGames() {
        const allMatches = this.getAllMatches();
        let gamesAssigned = 0;
        
        console.log(`🔍 Verificando ${allMatches.length} matches para asignación de juegos...`);
        
        allMatches.forEach(match => {
            if (this.assignGameToMatch(match)) {
                gamesAssigned++;
                console.log(`   ✅ Juego asignado al match ${match.id}: ${match.game.name} ${match.game.emoji}`);
            }
        });
        
        if (gamesAssigned > 0) {
            console.log(`🎮 ${gamesAssigned} juegos asignados a matches listos`);
        } else {
            console.log(`ℹ️ No hay matches listos para asignación de juegos`);
        }
        
        return gamesAssigned;
    }
    
    getNextGame() {
        if (this.gameQueue.length === 0) {
            this.gameQueue = [...this.games];
            this.usedGames = [];
        }
        
        const gameIndex = Math.floor(Math.random() * this.gameQueue.length);
        const selectedGame = this.gameQueue.splice(gameIndex, 1)[0];
        this.usedGames.push(selectedGame);
        return selectedGame;
    }
    
    getAllMatches() {
        const allMatches = [];
        
        this.winnersBracket.forEach((round, roundIndex) => {
            round.forEach(match => {
                // Agregar displayRound directamente al objeto original, no crear copia
                match.displayRound = 'W' + (roundIndex + 1);
                allMatches.push(match);
            });
        });
        
        this.losersBracket.forEach((round, roundIndex) => {
            round.forEach(match => {
                // Agregar displayRound directamente al objeto original, no crear copia
                match.displayRound = 'L' + (roundIndex + 1);
                allMatches.push(match);
            });
        });
        
        if (this.grandFinals) {
            this.grandFinals.displayRound = 'GF';
            allMatches.push(this.grandFinals);
        }
        
        if (this.grandFinalsReset) {
            this.grandFinalsReset.displayRound = 'GF Reset';
            allMatches.push(this.grandFinalsReset);
        }
        
        return allMatches;
    }
    
    getNextAvailableMatch() {
        const allMatches = this.getAllMatches();
        
        return allMatches.find(match => {
            if (match.completed) return false;
            
            if (match.dependsOn) {
                const dependencies = allMatches.filter(m => match.dependsOn.includes(m.id));
                return dependencies.every(dep => dep.completed);
            }
            
            return match.team1 && match.team2;
        });
    }
    
    processMatchResult(matchId, winnerId) {
        // Buscar el match en los brackets originales, no en copias
        let match = null;
        let matchLocation = null;
        
        // Buscar en Winners Bracket
        for (let roundIndex = 0; roundIndex < this.winnersBracket.length; roundIndex++) {
            const foundMatch = this.winnersBracket[roundIndex].find(m => m.id === matchId);
            if (foundMatch) {
                match = foundMatch;
                matchLocation = { bracket: 'winners', round: roundIndex };
                break;
            }
        }
        
        // Buscar en Losers Bracket si no se encontró
        if (!match) {
            for (let roundIndex = 0; roundIndex < this.losersBracket.length; roundIndex++) {
                const foundMatch = this.losersBracket[roundIndex].find(m => m.id === matchId);
                if (foundMatch) {
                    match = foundMatch;
                    matchLocation = { bracket: 'losers', round: roundIndex };
                    break;
                }
            }
        }
        
        // Buscar en Grand Finals si no se encontró
        if (!match && this.grandFinals && this.grandFinals.id === matchId) {
            match = this.grandFinals;
            matchLocation = { bracket: 'grand-finals' };
        }
        
        // Buscar en Grand Finals Reset si no se encontró
        if (!match && this.grandFinalsReset && this.grandFinalsReset.id === matchId) {
            match = this.grandFinalsReset;
            matchLocation = { bracket: 'grand-finals-reset' };
        }
        
        if (!match || match.completed) {
            console.error('Match no encontrado o ya completado:', matchId);
            return false;
        }
        
        // Validar que ambos equipos estén presentes
        if (!match.team1 || !match.team2) {
            console.error('Match incompleto - faltan equipos:', match);
            return false;
        }
        
        // Determinar ganador y perdedor
        const winner = match.team1.id === winnerId ? match.team1 : match.team2;
        const loser = match.team1.id === winnerId ? match.team2 : match.team1;
        
        // Actualizar el match original
        match.winner = winner;
        match.loser = loser;
        match.completed = true;
        match.completedAt = new Date().toISOString();
        
        console.log(`✅ Match completado: ${winner.name} venció a ${loser.name}`);
        
        // Actualizar estadísticas de equipos
        this.updateTeamStats(winner, loser);
        
        // Avanzar equipos a siguientes matches
        this.advanceTeams(match);
        
        return true;
    }
    
    advanceTeams(completedMatch) {
        console.log(`🔄 Avanzando equipos del match ${completedMatch.id} (${completedMatch.bracket})`);
        console.log(`   Ganador: ${completedMatch.winner.name}`);
        console.log(`   Perdedor: ${completedMatch.loser.name}`);
        
        // Avanzar ganador al siguiente match
        if (completedMatch.nextMatchId) {
            const nextMatch = this.findMatchById(completedMatch.nextMatchId);
            if (nextMatch) {
                // Determinar en qué slot colocar al ganador
                if (!nextMatch.team1) {
                    nextMatch.team1 = completedMatch.winner;
                    console.log(`   ➡️ ${completedMatch.winner.name} avanza como team1 al match ${nextMatch.id} (${nextMatch.bracket})`);
                } else if (!nextMatch.team2) {
                    nextMatch.team2 = completedMatch.winner;
                    console.log(`   ➡️ ${completedMatch.winner.name} avanza como team2 al match ${nextMatch.id} (${nextMatch.bracket})`);
                } else {
                    console.warn(`   ⚠️ Match ${nextMatch.id} ya está lleno, no se puede avanzar ${completedMatch.winner.name}`);
                }
                
                // Asignar juego si ambos equipos están presentes
                if (this.assignGameToMatch(nextMatch)) {
                    console.log(`   🎮 Juego asignado al match ${nextMatch.id}: ${nextMatch.game.name}`);
                }
                
                // NO verificar auto-avance automático para evitar cascadas
                // this.checkAutoAdvance(nextMatch);
            } else {
                console.warn(`   ⚠️ No se encontró el match ${completedMatch.nextMatchId} para avanzar ${completedMatch.winner.name}`);
            }
        }
        
        // Avanzar perdedor al losers bracket (solo si viene de winners bracket)
        if (completedMatch.bracket === 'winners' && completedMatch.loserNextMatchId) {
            const loserMatch = this.findMatchById(completedMatch.loserNextMatchId);
            if (loserMatch) {
                // Colocar perdedor en el slot correcto
                if (!loserMatch.team1) {
                    loserMatch.team1 = completedMatch.loser;
                    console.log(`   ⬇️ ${completedMatch.loser.name} va al losers bracket como team1 al match ${loserMatch.id}`);
                } else if (!loserMatch.team2) {
                    loserMatch.team2 = completedMatch.loser;
                    console.log(`   ⬇️ ${completedMatch.loser.name} va al losers bracket como team2 al match ${loserMatch.id}`);
                } else {
                    console.warn(`   ⚠️ Losers match ${loserMatch.id} ya está lleno, no se puede avanzar ${completedMatch.loser.name}`);
                }
                
                // Asignar juego si ambos equipos están presentes
                if (this.assignGameToMatch(loserMatch)) {
                    console.log(`   🎮 Juego asignado al losers match ${loserMatch.id}: ${loserMatch.game.name}`);
                }
                
                // NO verificar auto-avance automático para evitar cascadas
                // this.checkAutoAdvance(loserMatch);
            } else {
                console.warn(`   ⚠️ No se encontró el losers match ${completedMatch.loserNextMatchId} para ${completedMatch.loser.name}`);
            }
        } else if (completedMatch.bracket === 'losers') {
            console.log(`   ❌ ${completedMatch.loser.name} es eliminado del torneo`);
        }
        
        // Verificar si se completó el torneo
        this.checkTournamentCompletion();
    }
    
    // Verificar si un match puede avanzar automáticamente
    checkAutoAdvance(match) {
        if (match.completed) return;
        
        // Si solo hay un equipo en el match, ese equipo avanza automáticamente
        if (match.team1 && !match.team2) {
            console.log(`🎯 Auto-avance: ${match.team1.name} pasa automáticamente en match ${match.id}`);
            this.processAutoWin(match, match.team1.id);
        } else if (!match.team1 && match.team2) {
            console.log(`🎯 Auto-avance: ${match.team2.name} pasa automáticamente en match ${match.id}`);
            this.processAutoWin(match, match.team2.id);
        }
    }
    
    // Procesar una victoria automática
    processAutoWin(match, winnerId) {
        const winner = match.team1?.id === winnerId ? match.team1 : match.team2;
        const loser = null; // No hay perdedor en un auto-avance
        
        match.winner = winner;
        match.loser = loser;
        match.completed = true;
        match.completedAt = new Date().toISOString();
        match.autoWin = true; // Marcar como victoria automática
        
        console.log(`✅ Auto-victoria procesada: ${winner.name} en match ${match.id}`);
        
        // Actualizar estadísticas (auto-avance sin puntos, solo cuenta partida jugada)
        this.updateTeamStats(winner, null, true);
        
        // Avanzar al siguiente match
        if (match.nextMatchId) {
            const nextMatch = this.findMatchById(match.nextMatchId);
            if (nextMatch) {
                if (!nextMatch.team1) {
                    nextMatch.team1 = winner;
                    console.log(`   ➡️ ${winner.name} auto-avanza como team1 al match ${nextMatch.id}`);
                } else if (!nextMatch.team2) {
                    nextMatch.team2 = winner;
                    console.log(`   ➡️ ${winner.name} auto-avanza como team2 al match ${nextMatch.id}`);
                }
                
                // NO verificar auto-avance en cascada para evitar que bye llegue hasta Grand Finals
                // this.checkAutoAdvance(nextMatch);
            }
        }
    }
    
    // Actualizar estadísticas de equipos (modificado para manejar auto-victorias)
    updateTeamStats(winner, loser, isAutoWin = false) {
        const winnerTeam = this.teams.find(t => t.id === winner.id);
        
        if (winnerTeam) {
            winnerTeam.stats.played++;
            if (isAutoWin) {
                // No dar puntos por auto-avances, solo contar como partida jugada
                console.log(`📊 ${winner.name}: Auto-avance (sin puntos)`);
            } else {
                // Victoria completa - solo aquí se otorgan puntos
                winnerTeam.stats.won++;
                winnerTeam.stats.points += 3;
                console.log(`📊 ${winner.name}: +3 puntos (victoria)`);
            }
        }
        
        if (loser) {
            const loserTeam = this.teams.find(t => t.id === loser.id);
            if (loserTeam) {
                loserTeam.stats.played++;
                loserTeam.stats.lost++;
                // No dar puntos por participar - solo por ganar
                console.log(`📊 ${loser.name}: Derrota (sin puntos)`);
            }
        }
        
        // Guardar estadísticas actualizadas
        localStorage.setItem('tournament-teams', JSON.stringify(this.teams));
    }
    
    checkTournamentCompletion() {
        // Asignar juego a Grand Finals si ambos equipos están presentes
        if (this.grandFinals && this.grandFinals.team1 && this.grandFinals.team2 && !this.grandFinals.game) {
            this.assignGameToMatch(this.grandFinals);
        }
        
        // Asignar juego a Grand Finals Reset si ambos equipos están presentes
        if (this.grandFinalsReset && this.grandFinalsReset.team1 && this.grandFinalsReset.team2 && !this.grandFinalsReset.game) {
            this.assignGameToMatch(this.grandFinalsReset);
        }
        
        // Verificar si Grand Finals está completado
        if (this.grandFinals && this.grandFinals.completed) {
            const grandFinalsWinner = this.grandFinals.winner;
            const winnersChampion = this.getWinnersChampion();
            const losersChampion = this.getLosersChampion();
            
            console.log(`🏆 Grand Finals completado:`);
            console.log(`   Ganador: ${grandFinalsWinner.name}`);
            console.log(`   Campeón Winners: ${winnersChampion?.name}`);
            console.log(`   Campeón Losers: ${losersChampion?.name}`);
            
            // Si el ganador de Grand Finals es el campeón de Winners (no perdió ninguna partida)
            if (grandFinalsWinner.id === winnersChampion?.id) {
                console.log(`🏆 Torneo completado! Ganador: ${grandFinalsWinner.name}`);
                this.showTournamentWinner(grandFinalsWinner);
                return;
            }
            
            // Si el ganador de Grand Finals es el campeón de Losers, necesitamos Grand Finals Reset
            if (grandFinalsWinner.id === losersChampion?.id) {
                if (!this.grandFinalsReset.completed) {
                    // Configurar Grand Finals Reset
                    this.grandFinalsReset.team1 = winnersChampion;
                    this.grandFinalsReset.team2 = grandFinalsWinner;
                    
                    // Asignar juego inmediatamente
                    this.assignGameToMatch(this.grandFinalsReset);
                    
                    console.log(`🔄 Grand Finals Reset necesario: ${winnersChampion.name} vs ${grandFinalsWinner.name}`);
                    console.log(`   Razón: El equipo de Losers (${grandFinalsWinner.name}) ganó Grand Finals`);
                    return;
                } else {
                    // Grand Finals Reset completado
                    console.log(`🏆 Torneo completado! Ganador: ${this.grandFinalsReset.winner.name}`);
                    this.showTournamentWinner(this.grandFinalsReset.winner);
                    return;
                }
            }
        }
        
        // Verificar si Grand Finals Reset está completado
        if (this.grandFinalsReset && this.grandFinalsReset.completed) {
            console.log(`🏆 Torneo completado! Ganador: ${this.grandFinalsReset.winner.name}`);
            this.showTournamentWinner(this.grandFinalsReset.winner);
        }
    }
    
    showTournamentWinner(winner) {
        // Actualizar estado del torneo
        tournamentState = 'finished';
        localStorage.setItem('tournament-state', tournamentState);
        
        // Guardar datos de finalización
        const finishData = {
            winner: winner,
            finishedAt: new Date().toISOString(),
            totalTeams: teams.length,
            totalMatches: this.getAllMatches().filter(m => m.completed).length
        };
        localStorage.setItem('tournament-finish-data', JSON.stringify(finishData));
        
        // Mostrar modal de celebración
        showWinnerModal(winner);
        
        // Actualizar interfaz
        updateTournamentControls();
        updateLeaderboard();
    }
    
    getWinnersChampion() {
        if (this.winnersBracket.length === 0) return null;
        const finalRound = this.winnersBracket[this.winnersBracket.length - 1];
        if (finalRound.length === 0) return null;
        const finalMatch = finalRound[0];
        return finalMatch.completed ? finalMatch.winner : null;
    }
    
    getLosersChampion() {
        if (this.losersBracket.length === 0) return null;
        const finalRound = this.losersBracket[this.losersBracket.length - 1];
        if (finalRound.length === 0) return null;
        const finalMatch = finalRound[0];
        return finalMatch.completed ? finalMatch.winner : null;
    }
    
    // Método auxiliar para encontrar un match por ID en todos los brackets
    findMatchById(matchId) {
        // Buscar en Winners Bracket
        for (let round of this.winnersBracket) {
            const match = round.find(m => m.id === matchId);
            if (match) return match;
        }
        
        // Buscar en Losers Bracket
        for (let round of this.losersBracket) {
            const match = round.find(m => m.id === matchId);
            if (match) return match;
        }
        
        // Buscar en Grand Finals
        if (this.grandFinals && this.grandFinals.id === matchId) {
            return this.grandFinals;
        }
        
        // Buscar en Grand Finals Reset
        if (this.grandFinalsReset && this.grandFinalsReset.id === matchId) {
            return this.grandFinalsReset;
        }
        
        return null;
    }
    
    updateTeamStats(winner, loser, isAutoWin = false) {
        const winnerTeam = this.teams.find(t => t.id === winner.id);
        
        if (winnerTeam) {
            winnerTeam.stats.played++;
            if (isAutoWin) {
                // No dar puntos por auto-avances, solo contar como partida jugada
                console.log(`📊 ${winner.name}: Auto-avance (sin puntos)`);
            } else {
                // Victoria completa - solo aquí se otorgan puntos
                winnerTeam.stats.won++;
                winnerTeam.stats.points += 3;
                console.log(`📊 ${winner.name}: +3 puntos (victoria)`);
            }
        }
        
        if (loser) {
            const loserTeam = this.teams.find(t => t.id === loser.id);
            if (loserTeam) {
                loserTeam.stats.played++;
                loserTeam.stats.lost++;
                // No dar puntos por participar - solo por ganar
                console.log(`📊 ${loser.name}: Derrota (sin puntos)`);
            }
        }
        
        // Guardar estadísticas actualizadas
        localStorage.setItem('tournament-teams', JSON.stringify(this.teams));
    }
    
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
// ===== CLASE BRACKET VISUALIZER =====
class BracketVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.bracket = null;
        if (!this.container) return;
        this.setupStyles();
    }
    
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
                margin-bottom: 2rem;
            }
            
            .bracket-section.grand-finals {
                margin-top: 3rem;
                padding: 2rem;
                background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffcc02 100%);
                border-radius: var(--border-radius);
                border: 3px solid var(--accent-color);
                box-shadow: 0 8px 32px rgba(255, 107, 53, 0.3);
            }
            
            .bracket-section.grand-finals .bracket-title {
                font-size: 1.8rem;
                color: var(--bg-dark);
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
                margin-bottom: 1.5rem;
                text-align: center;
                font-weight: bold;
            }
            
            .bracket-section.grand-finals .round-title {
                color: var(--bg-dark);
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
                font-weight: bold;
            }
            
            .bracket-section.grand-finals .match-card {
                background: var(--bg-dark);
                border: 2px solid var(--accent-color);
                color: var(--text-primary);
            }
            
            .bracket-section.grand-finals .match-header {
                background: rgba(255, 204, 2, 0.2);
                color: var(--text-primary);
            }
            
            .bracket-section.grand-finals .team-slot {
                color: var(--text-primary);
                background: var(--bg-medium);
            }
            
            .bracket-section.grand-finals .winner-btn {
                background: var(--success-color);
                color: var(--bg-dark);
                font-weight: bold;
            }
            
            .teams-grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)) !important;
                gap: 1rem !important;
                margin-top: 1rem !important;
            }
            
            .team-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
                width: 100%;
                justify-content: center;
            }
            
            .info-btn, .remove-btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: var(--border-radius);
                font-family: 'Press Start 2P', monospace;
                font-size: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 80px;
            }
            
            .info-btn {
                background: var(--info-color, #17a2b8);
                color: white;
            }
            
            .info-btn:hover {
                background: #138496;
                transform: translateY(-2px);
            }
            
            .remove-btn {
                background: var(--danger-color, #dc3545);
                color: white;
            }
            
            .remove-btn:hover:not(:disabled) {
                background: #c82333;
                transform: translateY(-2px);
            }
            
            .remove-btn:disabled {
                background: #6c757d;
                cursor: not-allowed;
                opacity: 0.6;
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
                opacity: 0.4;
                font-style: italic;
            }
            .match-card.auto-win {
                background: linear-gradient(135deg, var(--bg-medium) 0%, rgba(76, 175, 80, 0.2) 100%);
                border: 2px solid var(--accent-color);
                opacity: 0.9;
            }
            .match-card.auto-win .match-header {
                background: rgba(76, 175, 80, 0.1);
            }
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
    }
    
    renderTournamentStatus(status) {
        return `
            <div class="bracket-section">
                <div class="bracket-title">Estado del Torneo</div>
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
                        <div style="color: var(--accent-color); font-size: 10px; margin-bottom: 0.3rem;">PROXIMA PARTIDA</div>
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
    
    renderWinnersBracket(winnersBracket) {
        if (!winnersBracket || winnersBracket.length === 0) return '';
        
        return `
            <div class="bracket-section">
                <div class="bracket-title">Winners Bracket</div>
                <div class="bracket-rounds">
                    ${winnersBracket.map((round, roundIndex) => {
                        let roundTitle = '';
                        if (roundIndex === winnersBracket.length - 1) {
                            roundTitle = 'Winners Finals';
                        } else if (roundIndex === winnersBracket.length - 2 && winnersBracket.length > 2) {
                            roundTitle = 'Winners Semifinals';
                        } else {
                            roundTitle = `Winners R${roundIndex + 1}`;
                        }
                        
                        return `
                            <div class="bracket-round">
                                <div class="round-title">${roundTitle}</div>
                                ${round.map(match => this.renderMatch(match, roundTitle)).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    renderLosersBracket(losersBracket) {
        if (!losersBracket || losersBracket.length === 0) return '';
        
        return `
            <div class="bracket-section">
                <div class="bracket-title">Losers Bracket</div>
                <div class="bracket-rounds">
                    ${losersBracket.map((round, roundIndex) => {
                        let roundTitle = '';
                        
                        if (roundIndex === losersBracket.length - 1) {
                            roundTitle = 'Losers Finals';
                        } else if (roundIndex === losersBracket.length - 2 && losersBracket.length > 2) {
                            roundTitle = 'Losers Semifinals';
                        } else if (roundIndex === 0) {
                            roundTitle = 'Losers R1';
                        } else {
                            // Para rondas intermedias, usar numeración específica
                            roundTitle = `Losers R${roundIndex + 1}`;
                        }
                        
                        return `
                            <div class="bracket-round">
                                <div class="round-title">${roundTitle}</div>
                                <div class="round-description" style="font-size: 0.6rem; color: var(--text-light); margin-bottom: 0.5rem; text-align: center;">
                                    ${this.getRoundDescription(roundIndex, losersBracket.length)}
                                </div>
                                ${round.map(match => this.renderMatch(match, roundTitle)).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    getRoundDescription(roundIndex, totalRounds) {
        if (roundIndex === 0) {
            return 'Perdedores de Winners R1';
        } else if (roundIndex === totalRounds - 1) {
            return 'Última oportunidad';
        } else if (roundIndex % 2 === 1) {
            return `Perdedores de Winners R${Math.ceil((roundIndex + 1) / 2) + 1} vs Ganadores anteriores`;
        } else {
            return 'Ganadores de ronda anterior';
        }
    }
    
    renderGrandFinals(grandFinals, grandFinalsReset) {
        if (!grandFinals) return '';
        
        // Solo mostrar Grand Finals Reset si:
        // 1. Grand Finals está completado
        // 2. El ganador de Grand Finals vino del Losers Bracket
        // 3. Grand Finals Reset tiene equipos asignados
        const shouldShowReset = grandFinalsReset && 
                               grandFinals.completed && 
                               grandFinalsReset.team1 && 
                               grandFinalsReset.team2;
        
        return `
            <div class="bracket-section grand-finals">
                <div class="bracket-title">Grand Finals</div>
                <div class="bracket-rounds">
                    <div class="bracket-round">
                        <div class="round-title">Grand Finals</div>
                        ${this.renderMatch(grandFinals, 'GF')}
                    </div>
                    ${shouldShowReset ? `
                        <div class="bracket-round">
                            <div class="round-title">Grand Finals Reset</div>
                            <div style="font-size: 0.7rem; color: var(--secondary-color); margin-bottom: 0.5rem; text-align: center;">
                                El equipo de Losers ganó Grand Finals
                            </div>
                            ${this.renderMatch(grandFinalsReset, 'GF Reset')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderMatch(match, displayRound) {
        const isAvailable = this.isMatchAvailable(match);
        let cardClass = '';
        
        if (match.completed) {
            cardClass = match.autoWin ? 'completed auto-win' : 'completed';
        } else if (isAvailable) {
            cardClass = 'available';
        }
        
        // Determinar si se pueden mostrar los botones de ganador
        const canShowWinnerButtons = !match.completed && match.team1 && match.team2 && match.game;
        
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
                
                ${canShowWinnerButtons ? `
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
                        ${match.autoWin ? '🎯 Avance Automático' : '✅ Completado'}
                    </div>
                ` : ''}
                
                ${!match.completed && (!match.team1 || !match.team2) ? `
                    <div style="text-align: center; margin-top: 0.5rem; font-size: 8px; color: var(--text-light);">
                        ⏳ Esperando equipos
                    </div>
                ` : ''}
                
                ${!match.completed && match.team1 && match.team2 && !match.game ? `
                    <div style="text-align: center; margin-top: 0.5rem; font-size: 8px; color: var(--accent-color);">
                        🎮 Asignando juego...
                    </div>
                ` : ''}
            </div>
        `;
    }
    
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
    
    isMatchAvailable(match) {
        if (match.completed || !match.team1 || !match.team2) return false;
        
        if (match.dependsOn && this.bracket) {
            const allMatches = this.bracket.getAllMatches();
            const dependencies = allMatches.filter(m => match.dependsOn.includes(m.id));
            return dependencies.every(dep => dep.completed);
        }
        
        return true;
    }
    
    update() {
        if (this.bracket) {
            this.render(this.bracket);
        }
    }
}

// Funcion global para declarar ganador
function declareMatchWinner(matchId, winnerId) {
    if (currentBracket) {
        const success = currentBracket.processMatchResult(matchId, winnerId);
        if (success) {
            // Forzar actualización completa
            forceUpdateVisualization();
            
            // Forzar actualización de la información del torneo para mostrar la nueva partida actual
            setTimeout(() => {
                updateTournamentInfo();
                
                // Buscar la siguiente partida disponible
                const nextMatch = currentBracket.getNextAvailableMatch();
                if (nextMatch) {
                    const roundName = nextMatch.displayRound || `${nextMatch.bracket.toUpperCase()} R${nextMatch.round}`;
                    console.log(`📍 Siguiente partida disponible: ${roundName} - Match #${nextMatch.id}`);
                    console.log(`👥 ${nextMatch.team1?.name || '❓ Esperando'} vs ${nextMatch.team2?.name || '❓ Esperando'}`);
                } else {
                    console.log(`🏁 No hay más partidas disponibles - Torneo podría estar completado`);
                }
            }, 500);
        }
    }
}

/**
 * Función para forzar actualización completa de la visualización
 */
function forceUpdateVisualization() {
    console.log('🔄 Forzando actualización completa de visualización...');
    
    if (!currentBracket) {
        console.warn('⚠️ No hay bracket para actualizar');
        return;
    }
    
    // Guardar estado primero
    saveBracketToStorage();
    
    // Limpiar y regenerar completamente la visualización
    const bracketsContainer = document.getElementById('brackets');
    if (bracketsContainer) {
        // Limpiar contenido actual
        bracketsContainer.innerHTML = '';
        
        // Recrear el visualizador
        bracketVisualizer = new BracketVisualizer('brackets');
        bracketVisualizer.render(currentBracket);
        
        // Agregar botones de control
        const controlButtonsHtml = `
            <div class="tournament-control-buttons" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin: 2rem 0; padding: 2rem; background: var(--bg-medium); border-radius: var(--border-radius);">
                <h3 style="width: 100%; text-align: center; color: var(--accent-color); margin-bottom: 1rem;">Controles del Torneo</h3>
                
                <button onclick="processManualAutoAdvances()" 
                        class="btn btn-info tournament-control-btn" 
                        id="auto-advance-btn"
                        style="background: var(--info-color, #17a2b8); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                    🎯 AVANZAR ACTUAL
                </button>

                <button onclick="assignGamesManually()" 
                        class="btn btn-secondary tournament-control-btn" 
                        id="assign-games-btn"
                        style="background: var(--secondary-color, #6c757d); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                    🎮 ASIGNAR JUEGOS
                </button>

                <button onclick="resetTournament()" 
                        class="btn btn-warning tournament-control-btn" 
                        id="reset-tournament-btn"
                        style="background: var(--warning-color, #ff9800); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                    🔄 REINICIAR
                </button>

                <button onclick="emergencyReset()" 
                        class="btn btn-danger tournament-control-btn" 
                        id="emergency-btn"
                        style="background: var(--danger-color, #f44336); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                    🚨 EMERGENCIA
                </button>
            </div>
        `;
        
        bracketsContainer.insertAdjacentHTML('beforeend', controlButtonsHtml);
    }
    
    // Actualizar información del torneo
    updateTournamentInfo();
    updateLeaderboard();
    
    console.log('✅ Actualización completa finalizada');
}

/**
 * Función para asignar juegos manualmente a matches que estén listos
 */
function assignGamesManually() {
    if (!currentBracket) {
        alert('⚠️ No hay torneo activo');
        return;
    }
    
    console.log('🎮 Asignación manual de juegos iniciada...');
    
    // Debug: Verificar estado antes de asignar
    const allMatches = currentBracket.getAllMatches();
    console.log('🔍 Estado ANTES de asignar juegos:');
    allMatches.slice(0, 5).forEach(match => {
        console.log(`   Match ${match.id}: game=${match.game ? match.game.name : 'NULL'}, team1=${match.team1?.name || 'NULL'}, team2=${match.team2?.name || 'NULL'}`);
    });
    
    const gamesAssigned = currentBracket.checkAndAssignGames();
    
    // Debug: Verificar estado después de asignar
    console.log('🔍 Estado DESPUÉS de asignar juegos:');
    allMatches.slice(0, 5).forEach(match => {
        console.log(`   Match ${match.id}: game=${match.game ? match.game.name : 'NULL'}, team1=${match.team1?.name || 'NULL'}, team2=${match.team2?.name || 'NULL'}`);
    });
    
    if (gamesAssigned > 0) {
        // Forzar actualización inmediata
        forceUpdateVisualization();
        
        alert(`✅ ${gamesAssigned} juegos asignados\n\nLos matches con ambos equipos presentes ahora tienen juegos asignados.`);
    } else {
        alert('ℹ️ No hay matches listos para asignación\n\nTodos los matches ya tienen juegos asignados o están esperando equipos.');
    }
}

/**
 * Función para manejar auto-avance de la partida actual/próxima solamente
 * Solo procesa la partida que se muestra como "próxima" en la información del torneo
 */
function processManualAutoAdvances() {
    if (!currentBracket) {
        alert('⚠️ No hay torneo activo');
        return;
    }
    
    // Buscar la próxima partida disponible (la que se muestra arriba)
    const nextMatch = currentBracket.getNextAvailableMatch();
    
    if (!nextMatch) {
        alert('ℹ️ No hay partidas disponibles para auto-avance\n\nTodas las partidas están completas o esperando resultados de otras partidas.');
        return;
    }
    
    // Verificar si la partida puede auto-avanzar
    const canAutoAdvance = (nextMatch.team1 && !nextMatch.team2) || (!nextMatch.team1 && nextMatch.team2);
    
    if (!canAutoAdvance) {
        const roundName = nextMatch.displayRound || `${nextMatch.bracket.toUpperCase()} R${nextMatch.round}`;
        let statusMessage = '';
        
        if (nextMatch.team1 && nextMatch.team2) {
            statusMessage = `Ambos equipos están presentes y deben jugar:\n` +
                          `🔵 ${nextMatch.team1.name}\n` +
                          `🔴 ${nextMatch.team2.name}\n\n` +
                          `Usa los botones "X Gana" en el bracket para declarar el ganador.`;
        } else if (!nextMatch.team1 && !nextMatch.team2) {
            statusMessage = `Ambos equipos están pendientes.\n` +
                          `Esta partida depende de que se completen otras partidas primero.\n\n` +
                          `Completa las partidas anteriores para que los equipos avancen aquí.`;
        }
        
        alert(`ℹ️ La partida actual no puede auto-avanzar\n\n` +
              `📍 ${roundName}\n` +
              `🎮 ${nextMatch.game?.name || 'Juego TBD'} ${nextMatch.game?.emoji || ''}\n` +
              `🆔 Match #${nextMatch.id}\n\n` +
              `${statusMessage}`);
        return;
    }
    
    const soloTeam = nextMatch.team1 || nextMatch.team2;
    const roundName = nextMatch.displayRound || `${nextMatch.bracket.toUpperCase()} R${nextMatch.round}`;
    
    const confirmMessage = `🎯 AUTO-AVANCE DE PARTIDA ACTUAL\n\n` +
        `📍 ${roundName}\n` +
        `🎮 ${nextMatch.game?.name || 'Juego TBD'} ${nextMatch.game?.emoji || ''}\n` +
        `🆔 Match #${nextMatch.id}\n\n` +
        `👥 Situación actual:\n` +
        `   ${nextMatch.team1?.name || '❓ Esperando equipo'}\n` +
        `   VS\n` +
        `   ${nextMatch.team2?.name || '❓ Esperando equipo'}\n\n` +
        `✅ ${soloTeam.name} avanzará automáticamente\n` +
        `   (no hay oponente disponible)\n\n` +
        `¿Proceder con el auto-avance?`;
    
    if (confirm(confirmMessage)) {
        console.log(`🎯 Procesando auto-avance manual para match ${nextMatch.id} (${roundName})`);
        
        // Procesar el auto-avance
        currentBracket.checkAutoAdvance(nextMatch);
        
        // Actualizar visualización completa
        if (bracketVisualizer) {
            bracketVisualizer.update();
        }
        saveBracketToStorage();
        updateTournamentInfo();
        updateLeaderboard();
        generateBrackets();
        
        // Buscar la siguiente partida disponible después del auto-avance
        const newNextMatch = currentBracket.getNextAvailableMatch();
        let nextMatchInfo = '';
        
        if (newNextMatch) {
            const newRoundName = newNextMatch.displayRound || `${newNextMatch.bracket.toUpperCase()} R${newNextMatch.round}`;
            nextMatchInfo = `\n\n📍 Siguiente partida disponible:\n` +
                          `   ${newRoundName}\n` +
                          `   🆔 Match #${newNextMatch.id}\n` +
                          `   👥 ${newNextMatch.team1?.name || '❓ Esperando'} vs ${newNextMatch.team2?.name || '❓ Esperando'}`;
        } else {
            nextMatchInfo = `\n\n🏁 No hay más partidas disponibles.\n` +
                          `   El torneo podría estar completado o esperando otros resultados.`;
        }
        
        alert(`✅ Auto-avance completado\n\n` +
              `🏆 ${soloTeam.name} avanzó automáticamente\n` +
              `📍 Desde: ${roundName}\n` +
              `🆔 Match #${nextMatch.id}` +
              nextMatchInfo);
        
        // Forzar actualización de la información del torneo para mostrar la nueva partida actual
        setTimeout(() => {
            updateTournamentInfo();
        }, 300);
        
        // Segunda actualización para asegurar sincronización completa
        setTimeout(() => {
            updateTournamentInfo();
        }, 800);
    }
}

/**
 * Muestra un modal de celebración para el ganador del torneo
 */
function showWinnerModal(winner) {
    // Buscar el equipo completo con estadísticas actualizadas
    const winnerTeam = teams.find(team => team.id === winner.id) || winner;
    
    // Crear el modal
    const modal = document.createElement('div');
    modal.id = 'winner-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.5s ease-in-out;
    `;
    
    // Obtener foto del equipo
    const teamPhoto = winnerTeam.photos && winnerTeam.photos.team 
        ? `<img src="${winnerTeam.photos.team}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--accent-color); margin-bottom: 1rem;">`
        : `<img src="${createTeamPlaceholder(winnerTeam.name)}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--accent-color); margin-bottom: 1rem;">`;
    
    // Asegurar que las estadísticas existan
    const stats = winnerTeam.stats || { played: 0, won: 0, lost: 0, points: 0 };
    
    // Contenido del modal
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-medium) 100%);
            padding: 3rem;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            border: 3px solid var(--accent-color);
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            position: relative;
            overflow: hidden;
            animation: modalSlideIn 0.6s ease-out;
        ">
            <!-- Efectos de fondo -->
            <div style="
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,204,2,0.1) 0%, transparent 70%);
                animation: rotate 10s linear infinite;
                pointer-events: none;
            "></div>
            
            <!-- Contenido principal -->
            <div style="position: relative; z-index: 2;">
                <h1 style="
                    color: var(--accent-color);
                    font-size: 2rem;
                    margin-bottom: 1rem;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                    animation: bounce 1s ease-in-out infinite alternate;
                ">🏆 ¡CAMPEÓN! 🏆</h1>
                
                ${teamPhoto}
                
                <h2 style="
                    color: var(--primary-color);
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                ">${winnerTeam.name}</h2>
                
                <p style="
                    color: var(--secondary-color);
                    font-size: 1rem;
                    margin-bottom: 2rem;
                    opacity: 0.9;
                ">${winnerTeam.players.join(' & ')}</p>
                
                <div style="
                    background: var(--bg-light);
                    padding: 1rem;
                    border-radius: 10px;
                    margin-bottom: 2rem;
                    border: 1px solid var(--secondary-color);
                ">
                    <h3 style="color: var(--accent-color); margin-bottom: 0.5rem;">📊 Estadísticas Finales</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
                        <div>🎮 Partidas: <strong>${stats.played}</strong></div>
                        <div>🏆 Victorias: <strong>${stats.won}</strong></div>
                        <div>💔 Derrotas: <strong>${stats.lost}</strong></div>
                        <div>⭐ Puntos: <strong>${stats.points}</strong></div>
                    </div>
                </div>
                
                <button onclick="closeWinnerModal()" style="
                    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 25px;
                    font-family: 'Press Start 2P', monospace;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🎉 ¡GENIAL!
                </button>
            </div>
        </div>
    `;
    
    // Agregar estilos de animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
            from { 
                opacity: 0;
                transform: translateY(-50px) scale(0.8);
            }
            to { 
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @keyframes bounce {
            from { transform: translateY(0px); }
            to { transform: translateY(-10px); }
        }
        
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        @keyframes confetti-fall {
            0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        
        .confetti {
            position: fixed;
            width: 10px;
            height: 10px;
            z-index: 9999;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
    
    // Agregar modal al DOM
    document.body.appendChild(modal);
    
    // Iniciar animación de confetti
    startConfetti();
    
    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
        if (document.getElementById('winner-modal')) {
            closeWinnerModal();
        }
    }, 10000);
}

/**
 * Cierra el modal de celebración
 */
function closeWinnerModal() {
    const modal = document.getElementById('winner-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-in-out';
        setTimeout(() => {
            modal.remove();
            stopConfetti();
        }, 300);
    }
}

/**
 * Inicia la animación de confetti
 */
function startConfetti() {
    const colors = ['#ff6b35', '#f7931e', '#ffcc02', '#4caf50', '#2196f3', '#9c27b0'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
        }, i * 100);
    }
    
    // Continuar creando confetti cada 2 segundos
    window.confettiInterval = setInterval(() => {
        for (let i = 0; i < 10; i++) {
            createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
        }
    }, 2000);
}

/**
 * Detiene la animación de confetti
 */
function stopConfetti() {
    if (window.confettiInterval) {
        clearInterval(window.confettiInterval);
        window.confettiInterval = null;
    }
    
    // Limpiar confetti existente
    setTimeout(() => {
        const confettiPieces = document.querySelectorAll('.confetti');
        confettiPieces.forEach(piece => piece.remove());
    }, 3000);
}

/**
 * Crea una pieza individual de confetti
 */
function createConfettiPiece(color) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.cssText = `
        background: ${color};
        left: ${Math.random() * 100}%;
        animation: confetti-fall ${3 + Math.random() * 2}s linear forwards;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
    `;
    
    document.body.appendChild(confetti);
    
    // Limpiar después de la animación
    setTimeout(() => {
        if (confetti.parentNode) {
            confetti.remove();
        }
    }, 5000);
}

// Agregar estilo fadeOut para el cierre del modal
const fadeOutStyle = document.createElement('style');
fadeOutStyle.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(fadeOutStyle);
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
    
    // Verificar consistencia del estado
    loadBracketFromStorage();
    
    // Si el estado es 'active' pero no hay bracket, resetear a 'preparing'
    if (tournamentState === 'active' && !currentBracket) {
        console.log('Estado inconsistente detectado, reseteando a preparing');
        tournamentState = 'preparing';
        localStorage.setItem('tournament-state', tournamentState);
    }
    
    showSection('brackets');
}

// ===== GESTION DEL BRACKET =====
function loadBracketFromStorage() {
    try {
        const bracketData = localStorage.getItem('tournament-bracket');
        if (bracketData && teams.length > 0) {
            const data = JSON.parse(bracketData);
            currentBracket = new DoubleEliminationBracket(teams, games);
            restoreBracketState(currentBracket, data);
            console.log('Bracket cargado desde localStorage');
        } else {
            currentBracket = null;
            console.log('No hay bracket en localStorage o no hay equipos');
        }
    } catch (error) {
        console.error('Error cargando bracket:', error);
        currentBracket = null;
        // Limpiar datos corruptos
        localStorage.removeItem('tournament-bracket');
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
            
            // Debug: Verificar que los juegos se están guardando
            console.log('💾 Guardando bracket en localStorage...');
            const firstMatch = bracketData.winnersBracket[0]?.[0];
            if (firstMatch) {
                console.log(`   Primer match: game=${firstMatch.game ? firstMatch.game.name : 'NULL'}`);
            }
            
            localStorage.setItem('tournament-bracket', JSON.stringify(bracketData));
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
            console.log('✅ Bracket guardado en localStorage');
        } catch (error) {
            console.error('❌ Error guardando bracket:', error);
        }
    }
}

function restoreBracketState(bracket, data) {
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
    
    // Si ya hay un torneo activo, preguntar si reiniciar
    if (tournamentState === 'active') {
        if (!confirm('Ya hay un torneo activo.\n\n¿Quieres reiniciarlo y crear un nuevo bracket?\n\n⚠️ Esto eliminará el progreso actual.')) {
            return;
        }
        // Resetear estadísticas antes de crear nuevo bracket
        teams.forEach(team => {
            team.stats = { played: 0, won: 0, lost: 0, points: 0 };
        });
    }
    
    const teamCount = teams.length;
    const estimatedMatches = (teamCount - 1) + (teamCount - 2) + 1;
    
    const confirmMessage = 'Iniciar Bracket de Doble Eliminacion?\n\n' +
        'Configuracion:\n' +
        '• ' + teamCount + ' equipos registrados\n' +
        '• ' + games.length + ' juegos disponibles\n' +
        '• Aproximadamente ' + estimatedMatches + ' partidas\n' +
        '• Sistema: Winners + Losers + Grand Finals\n' +
        '• Puntos: 3 por victoria únicamente\n\n' +
        'Continuar?';
    
    if (confirm(confirmMessage)) {
        try {
            currentBracket = new DoubleEliminationBracket(teams, games);
            tournamentState = 'active';
            localStorage.setItem('tournament-state', tournamentState);
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
            saveBracketToStorage();
            updateTournamentInfo();
            updateTournamentControls();
            generateBrackets();
            
            // Asignar juegos a matches que ya estén listos
            setTimeout(() => {
                const gamesAssigned = currentBracket.checkAndAssignGames();
                if (gamesAssigned > 0) {
                    console.log(`🔄 Actualizando visualización después de asignar ${gamesAssigned} juegos...`);
                    // Forzar actualización completa
                    forceUpdateVisualization();
                    console.log(`✅ Visualización actualizada`);
                }
            }, 500);
            
            const actualMatches = currentBracket.getAllMatches().length;
            alert('Bracket de Doble Eliminacion Creado!\n\n' +
                'Partidas generadas: ' + actualMatches + '\n' +
                'Winners Bracket: ' + currentBracket.winnersBracket.length + ' rondas\n' +
                'Losers Bracket: ' + currentBracket.losersBracket.length + ' rondas\n' +
                'Grand Finals: Lista');
            
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
        currentBracket = null;
        localStorage.removeItem('tournament-bracket');
        
        teams.forEach(team => {
            team.stats = { played: 0, won: 0, lost: 0, points: 0 };
        });
        localStorage.setItem('tournament-teams', JSON.stringify(teams));
        
        updateTournamentInfo();
        updateTournamentControls();
        loadTeams();
        generateBrackets();
        updateLeaderboard();
        
        alert('Torneo reiniciado correctamente');
    }
}

/**
 * Finaliza el torneo actual y marca el estado como terminado
 */
function finalizeTournament() {
    if (!currentBracket) {
        alert('⚠️ No hay torneo activo para finalizar');
        return;
    }
    
    const confirmMessage = '🏆 FINALIZAR TORNEO 🏆\n\n' +
        'Esta acción marcará el torneo como terminado.\n' +
        'Los resultados se mantendrán para consulta.\n\n' +
        '¿Confirmar finalización del torneo?';
    
    if (confirm(confirmMessage)) {
        tournamentState = 'finished';
        localStorage.setItem('tournament-state', tournamentState);
        
        // Guardar timestamp de finalización
        const finishData = {
            finishedAt: new Date().toISOString(),
            totalTeams: teams.length,
            totalMatches: currentBracket ? currentBracket.getAllMatches().filter(m => m.completed).length : 0
        };
        localStorage.setItem('tournament-finish-data', JSON.stringify(finishData));
        
        updateTournamentInfo();
        updateTournamentControls();
        generateBrackets();
        updateLeaderboard();
        
        alert('🎉 ¡Torneo finalizado exitosamente!\n\n' +
              'Los resultados han sido guardados.\n' +
              'Puedes consultar la clasificación final en cualquier momento.');
    }
}

/**
 * Limpia todos los datos del torneo (equipos, partidas, chat)
 * Mantiene los juegos por defecto
 */
function clearAllData() {
    const confirmMessage = '🧹 LIMPIAR TODOS LOS DATOS 🧹\n\n' +
        'Se eliminarán:\n' +
        '• Todos los equipos registrados\n' +
        '• Historial de partidas y brackets\n' +
        '• Mensajes del chat\n' +
        '• Juegos personalizados\n\n' +
        'Se mantendrán:\n' +
        '• Juegos por defecto del sistema\n\n' +
        '¿Continuar con la limpieza?';
    
    if (confirm(confirmMessage)) {
        // Limpiar datos específicos del torneo
        teams = [];
        chatMessages = [];
        tournamentState = 'preparing';
        currentBracket = null;
        bracketVisualizer = null;
        
        // Restaurar juegos por defecto
        games = [
            { id: 1, name: 'Mario Kart', emoji: '🏎️', rules: 'Carrera de 4 vueltas. Gana el primero en llegar a la meta.' },
            { id: 2, name: 'Super Smash Bros', emoji: '👊', rules: 'Mejor de 3 rounds. Sin items. Escenarios neutrales.' },
            { id: 3, name: 'Marvel vs Capcom 3', emoji: '⚡', rules: 'Mejor de 5 rounds. Equipos de 3 personajes.' },
            { id: 4, name: 'Mario Party', emoji: '🎲', rules: '10 turnos. Gana quien tenga más estrellas al final.' },
            { id: 5, name: 'Street Fighter', emoji: '🥊', rules: 'Mejor de 5 rounds. Sin super meter inicial.' },
            { id: 6, name: 'Tekken 7', emoji: '🥋', rules: 'Mejor de 3 rounds. Sin rage arts iniciales.' },
            { id: 7, name: 'Rocket League', emoji: '⚽', rules: '5 minutos. Gana quien tenga más goles.' }
        ];
        
        // Limpiar localStorage específico
        localStorage.removeItem('tournament-teams');
        localStorage.removeItem('tournament-chat');
        localStorage.removeItem('tournament-bracket');
        localStorage.removeItem('tournament-bracket-visualizer');
        localStorage.removeItem('tournament-finish-data');
        localStorage.setItem('tournament-state', tournamentState);
        localStorage.setItem('tournament-games', JSON.stringify(games));
        
        // Actualizar interfaz
        loadTeams();
        loadGames();
        loadChatSidebar();
        updateTournamentInfo();
        updateTournamentControls();
        generateBrackets();
        updateLeaderboard();
        
        alert('✅ Datos limpiados correctamente\n\n' +
              'El sistema está listo para un nuevo torneo.');
    }
}

function emergencyCleanup() {
    if (confirm('🚨 LIMPIEZA DE EMERGENCIA 🚨\n\nEsto eliminará TODOS los datos:\n- Equipos registrados\n- Historial de partidas\n- Mensajes de chat\n- Juegos personalizados\n- Estado del torneo\n\n¿Estás seguro?')) {
        if (confirm('⚠️ ÚLTIMA CONFIRMACIÓN ⚠️\n\nEsta acción NO se puede deshacer.\n¿Proceder con la limpieza completa?')) {
            // Limpiar completamente localStorage
            localStorage.clear();
            
            // Resetear variables globales
            teams = [];
            games = [
                { id: 1, name: 'Mario Kart', emoji: '🏎️', rules: 'Carrera de 4 vueltas. Gana el primero en llegar a la meta.' },
                { id: 2, name: 'Super Smash Bros', emoji: '👊', rules: 'Mejor de 3 rounds. Sin items. Escenarios neutrales.' },
                { id: 3, name: 'Marvel vs Capcom 3', emoji: '⚡', rules: 'Mejor de 5 rounds. Equipos de 3 personajes.' },
                { id: 4, name: 'Mario Party', emoji: '🎲', rules: '10 turnos. Gana quien tenga más estrellas al final.' },
                { id: 5, name: 'Street Fighter', emoji: '🥊', rules: 'Mejor de 5 rounds. Sin super meter inicial.' },
                { id: 6, name: 'Tekken 7', emoji: '🥋', rules: 'Mejor de 3 rounds. Sin rage arts iniciales.' },
                { id: 7, name: 'Rocket League', emoji: '⚽', rules: '5 minutos. Gana quien tenga más goles.' }
            ];
            chatMessages = [];
            tournamentState = 'preparing';
            currentBracket = null;
            
            // Reinicializar localStorage con datos por defecto
            localStorage.setItem('tournament-games', JSON.stringify(games));
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
            localStorage.setItem('tournament-chat', JSON.stringify(chatMessages));
            localStorage.setItem('tournament-state', tournamentState);
            
            // Recargar toda la interfaz
            loadTeams();
            loadGames();
            loadChatSidebar();
            updateTournamentInfo();
            updateTournamentControls();
            generateBrackets();
            updateLeaderboard();
            
            alert('🧹 Limpieza de emergencia completada.\nLa aplicación ha sido reiniciada completamente.');
        }
    }
}

function optimizeStorage() {
    if (confirm('🧹 OPTIMIZAR ALMACENAMIENTO 🧹\n\nEsto eliminará:\n- Mensajes de chat antiguos (mantiene últimos 50)\n- Datos temporales corruptos\n- Caché innecesario\n\n¿Continuar?')) {
        try {
            // Limpiar mensajes de chat antiguos
            if (chatMessages.length > 50) {
                chatMessages = chatMessages.slice(-50);
                localStorage.setItem('tournament-chat', JSON.stringify(chatMessages));
            }
            
            // Limpiar datos corruptos del bracket si existen
            const bracketData = localStorage.getItem('tournament-bracket');
            if (bracketData) {
                try {
                    JSON.parse(bracketData);
                } catch (e) {
                    localStorage.removeItem('tournament-bracket');
                    console.log('Datos de bracket corruptos eliminados');
                }
            }
            
            // Verificar consistencia de equipos
            teams.forEach(team => {
                if (!team.stats) {
                    team.stats = { played: 0, won: 0, lost: 0, points: 0 };
                }
            });
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
            
            // Recargar interfaz
            loadChatSidebar();
            updateTournamentInfo();
            
            alert('✅ Almacenamiento optimizado correctamente.');
        } catch (error) {
            console.error('Error durante optimización:', error);
            alert('❌ Error durante la optimización. Considera usar Limpieza de Emergencia.');
        }
    }
}

function generateBrackets() {
    const container = document.getElementById('brackets');
    if (!container) return;
    
    if (tournamentState === 'preparing') {
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

                <!-- BOTONES DE CONTROL DEL TORNEO -->
                <div class="tournament-control-buttons" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin: 2rem 0;">
                    <!-- Botón Comenzar Torneo -->
                    <button onclick="startTournament()" 
                            class="btn btn-success tournament-control-btn" 
                            id="start-tournament-btn"
                            style="background: var(--success-color, #4caf50); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;"
                            ${teams.length < 2 ? 'disabled' : ''}>
                        🚀 COMENZAR
                    </button>

                    <!-- Botón Reiniciar Torneo -->
                    <button onclick="resetTournament()" 
                            class="btn btn-warning tournament-control-btn" 
                            id="reset-tournament-btn"
                            style="background: var(--warning-color, #ff9800); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🔄 REINICIAR
                    </button>

                    <!-- Botón Limpiar Datos -->
                    <button onclick="cleanTournamentData()" 
                            class="btn btn-secondary tournament-control-btn" 
                            id="clean-data-btn"
                            style="background: var(--secondary-color, #6c757d); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🧹 LIMPIAR
                    </button>

                    <!-- Botón de Emergencia -->
                    <button onclick="emergencyReset()" 
                            class="btn btn-danger tournament-control-btn" 
                            id="emergency-btn"
                            style="background: var(--danger-color, #f44336); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🚨 EMERGENCIA
                    </button>
                </div>
                
                ${teams.length >= 2 ? `
                    <div style="background: var(--bg-dark); padding: 1rem; border-radius: var(--border-radius); margin-top: 2rem;">
                        <p style="color: var(--secondary-color);">Haz clic en "COMENZAR" para generar el bracket</p>
                        <p style="font-size: 10px; opacity: 0.6; margin-top: 0.5rem;">
                            Con ${teams.length} equipos se generaran aproximadamente ${Math.ceil((teams.length - 1) + (teams.length - 2) + 1)} partidas
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
    
    // Si el torneo está activo pero no hay bracket, mostrar mensaje de error
    if (tournamentState === 'active' && !currentBracket) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3 style="color: var(--danger-color);">Error: Bracket no encontrado</h3>
                <p>El bracket se perdio. Reinicia el torneo para crear uno nuevo.</p>
                
                <!-- BOTONES DE CONTROL DE EMERGENCIA -->
                <div class="tournament-control-buttons" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin: 2rem 0; padding: 2rem; background: var(--bg-medium); border-radius: var(--border-radius);">
                    <h3 style="width: 100%; text-align: center; color: var(--accent-color); margin-bottom: 1rem;">Controles de Emergencia</h3>
                    
                    <!-- Botón Reiniciar Torneo -->
                    <button onclick="resetTournament()" 
                            class="btn btn-warning tournament-control-btn" 
                            id="reset-tournament-emergency-btn"
                            style="background: var(--warning-color, #ff9800); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🔄 REINICIAR
                    </button>

                    <!-- Botón de Emergencia -->
                    <button onclick="emergencyReset()" 
                            class="btn btn-danger tournament-control-btn" 
                            id="emergency-error-btn"
                            style="background: var(--danger-color, #f44336); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🚨 EMERGENCIA
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Renderizar bracket activo
    if (currentBracket) {
        if (!bracketVisualizer) {
            bracketVisualizer = new BracketVisualizer('brackets');
        }
        bracketVisualizer.render(currentBracket);
        
        // Agregar botones de control después del bracket
        const controlButtonsHtml = `
            <div class="tournament-control-buttons" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin: 2rem 0; padding: 2rem; background: var(--bg-medium); border-radius: var(--border-radius);">
                <h3 style="width: 100%; text-align: center; color: var(--accent-color); margin-bottom: 1rem;">Controles del Torneo</h3>
                
                <!-- Botón Comenzar/Nuevo Torneo -->
                ${tournamentState === 'preparing' ? `
                    <button onclick="startTournament()" 
                            class="btn btn-success tournament-control-btn" 
                            id="start-tournament-btn"
                            style="background: var(--success-color, #4caf50); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;"
                            ${teams.length < 2 ? 'disabled' : ''}>
                        🚀 COMENZAR
                    </button>
                ` : ''}
                
                ${tournamentState === 'finished' ? `
                    <button onclick="startTournament()" 
                            class="btn btn-success tournament-control-btn" 
                            id="new-tournament-btn"
                            style="background: var(--success-color, #4caf50); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;"
                            ${teams.length < 2 ? 'disabled' : ''}>
                        🚀 NUEVO TORNEO
                    </button>
                ` : ''}

                <!-- Botón Reiniciar Torneo -->
                ${tournamentState === 'active' || tournamentState === 'finished' ? `
                    <button onclick="resetTournament()" 
                            class="btn btn-warning tournament-control-btn" 
                            id="reset-tournament-btn"
                            style="background: var(--warning-color, #ff9800); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🔄 REINICIAR
                    </button>
                ` : ''}

                <!-- Botón Finalizar Torneo -->
                ${tournamentState === 'active' ? `
                    <button onclick="finalizeTournament()" 
                            class="btn btn-primary tournament-control-btn" 
                            id="finalize-tournament-btn"
                            style="background: var(--primary-color, #2196f3); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🏆 FINALIZAR
                    </button>
                ` : ''}

                <!-- Botón Auto-Avances -->
                ${tournamentState === 'active' ? `
                    <button onclick="processManualAutoAdvances()" 
                            class="btn btn-info tournament-control-btn" 
                            id="auto-advance-btn"
                            style="background: var(--info-color, #17a2b8); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🎯 AVANZAR ACTUAL
                    </button>
                ` : ''}

                <!-- Botón Asignar Juegos -->
                ${tournamentState === 'active' ? `
                    <button onclick="assignGamesManually()" 
                            class="btn btn-secondary tournament-control-btn" 
                            id="assign-games-btn"
                            style="background: var(--secondary-color, #6c757d); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🎮 ASIGNAR JUEGOS
                    </button>
                ` : ''}

                <!-- Botón Limpiar Datos -->
                ${tournamentState === 'preparing' || tournamentState === 'finished' ? `
                    <button onclick="clearAllData()" 
                            class="btn btn-secondary tournament-control-btn" 
                            id="clear-data-btn"
                            style="background: var(--secondary-color, #6c757d); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                        🧹 LIMPIAR DATOS
                    </button>
                ` : ''}

                <!-- Botón de Emergencia - SIEMPRE VISIBLE -->
                <button onclick="emergencyReset()" 
                        class="btn btn-danger tournament-control-btn" 
                        id="emergency-btn"
                        style="background: var(--danger-color, #f44336); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius); font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer; transition: all 0.3s ease; min-width: 140px;">
                    🚨 EMERGENCIA
                </button>
            </div>
        `;
        
        // Agregar los botones al final del contenedor
        container.insertAdjacentHTML('beforeend', controlButtonsHtml);
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
        let nextMatchInfo = '';
        
        // Mostrar información de la próxima partida si el torneo está activo
        if (tournamentState === 'active' && currentBracket) {
            const nextMatch = currentBracket.getNextAvailableMatch();
            if (nextMatch) {
                const roundName = nextMatch.displayRound || `${nextMatch.bracket.toUpperCase()} R${nextMatch.round}`;
                const gameInfo = nextMatch.game ? `${nextMatch.game.emoji} ${nextMatch.game.name}` : '🎮 TBD';
                const team1Name = nextMatch.team1?.name || '❓ Esperando';
                const team2Name = nextMatch.team2?.name || '❓ Esperando';
                
                nextMatchInfo = `
                    <div style="margin-top: 0.8rem; padding: 0.8rem; background: var(--bg-light); border-radius: var(--border-radius); border-left: 4px solid var(--accent-color);">
                        <div style="font-weight: bold; color: var(--accent-color); margin-bottom: 0.3rem;">📍 Próxima Partida:</div>
                        <div style="font-size: 0.9rem; line-height: 1.4;">
                            <div><strong>${roundName}</strong> - Match #${nextMatch.id}</div>
                            <div>${gameInfo}</div>
                            <div style="margin-top: 0.3rem;">
                                <span style="color: var(--primary-color);">${team1Name}</span>
                                <span style="margin: 0 0.5rem;">VS</span>
                                <span style="color: var(--secondary-color);">${team2Name}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                nextMatchInfo = `
                    <div style="margin-top: 0.8rem; padding: 0.8rem; background: var(--bg-light); border-radius: var(--border-radius); border-left: 4px solid var(--success-color);">
                        <div style="font-weight: bold; color: var(--success-color);">🏁 No hay partidas disponibles</div>
                        <div style="font-size: 0.9rem; margin-top: 0.3rem;">Todas las partidas están completas o esperando otros resultados</div>
                    </div>
                `;
            }
        }
        
        tournamentStatusEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <span>${status}</span>
                ${tournamentState === 'preparing' && teams.length >= 2 ? `
                    <small style="color: var(--text-light);">Haz clic en "Comenzar" para generar el bracket</small>
                ` : ''}
                ${nextMatchInfo}
            </div>
        `;
    }
}

function updateTournamentControls() {
    // Buscar botones tanto en la parte superior como en la sección de brackets
    const startBtn = document.getElementById('start-btn') || 
                     document.getElementById('start-tournament-btn') || 
                     document.getElementById('new-tournament-btn');
    const resetBtn = document.getElementById('reset-btn') || 
                     document.getElementById('reset-tournament-btn') || 
                     document.getElementById('reset-tournament-emergency-btn');
    const finalizeBtn = document.getElementById('finalize-btn') || 
                        document.getElementById('finalize-tournament-btn');
    const clearBtn = document.getElementById('clear-btn') || 
                     document.getElementById('clear-data-btn');
    const emergencyBtn = document.getElementById('emergency-btn') || 
                         document.getElementById('emergency-tournament-btn') || 
                         document.getElementById('emergency-finished-btn') || 
                         document.getElementById('emergency-error-btn');
    const autoAdvanceBtn = document.getElementById('auto-advance-btn');
    
    updateFormVisibility();
    
    console.log(`🎛️ Actualizando controles del torneo - Estado: ${tournamentState}`);
    
    // Los botones ahora se renderizan dinámicamente en generateBrackets()
    // Esta función solo actualiza el estado si los botones ya existen
    
    if (startBtn) {
        startBtn.disabled = teams.length < 2;
        console.log('✅ Botón Comenzar/Nuevo encontrado y actualizado');
    }
    
    if (resetBtn) {
        console.log('✅ Botón Reiniciar encontrado');
    }
    
    if (finalizeBtn) {
        console.log('✅ Botón Finalizar encontrado');
    }
    
    if (clearBtn) {
        console.log('✅ Botón Limpiar encontrado');
    }
    
    if (emergencyBtn) {
        console.log('✅ Botón Emergencia encontrado');
    }
    
    if (autoAdvanceBtn) {
        console.log('✅ Botón Auto-Avance encontrado');
    }
    
    // Log para debugging
    console.log('🎛️ Controles encontrados:', {
        startBtn: startBtn ? 'encontrado' : 'no encontrado',
        resetBtn: resetBtn ? 'encontrado' : 'no encontrado', 
        finalizeBtn: finalizeBtn ? 'encontrado' : 'no encontrado',
        clearBtn: clearBtn ? 'encontrado' : 'no encontrado',
        emergencyBtn: emergencyBtn ? 'encontrado' : 'no encontrado',
        autoAdvanceBtn: autoAdvanceBtn ? 'encontrado' : 'no encontrado'
    });
    
    // Forzar regeneración de brackets para asegurar que los botones aparezcan
    setTimeout(() => {
        generateBrackets();
    }, 100);
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
async function registerTeam() {
    const teamName = document.getElementById('team-name').value.trim();
    const player1 = document.getElementById('player1-name').value.trim();
    const player2 = document.getElementById('player2-name').value.trim();
    
    console.log('registerTeam() - Datos:', { teamName, player1, player2 });
    
    if (!teamName || !player1 || !player2) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }
    
    if (teams.find(team => team.name.toLowerCase() === teamName.toLowerCase())) {
        alert('Ya existe un equipo con ese nombre');
        return;
    }
    
    const newTeam = {
        id: Date.now(),
        name: teamName,
        players: [player1, player2],
        stats: { played: 0, won: 0, lost: 0, points: 0 },
        photos: { team: null, player1: null, player2: null }
    };
    
    console.log('registerTeam() - Nuevo equipo:', newTeam);
    
    // Esperar a que se carguen las fotos
    await handleTeamPhotos(newTeam);
    
    teams.push(newTeam);
    localStorage.setItem('tournament-teams', JSON.stringify(teams));
    
    console.log('registerTeam() - Equipos después de agregar:', teams);
    
    document.getElementById('team-form').reset();
    loadTeams();
    updateTournamentInfo();
    generateBrackets();
    alert('Equipo "' + teamName + '" registrado exitosamente!');
}

function handleTeamPhotos(team) {
    return new Promise((resolve) => {
        const teamPhotoInput = document.getElementById('team-photo');
        const player1PhotoInput = document.getElementById('player1-photo');
        const player2PhotoInput = document.getElementById('player2-photo');
        
        let pendingReads = 0;
        let completedReads = 0;
        
        const checkComplete = () => {
            completedReads++;
            if (completedReads === pendingReads) {
                localStorage.setItem('tournament-teams', JSON.stringify(teams));
                resolve();
            }
        };
        
        if (teamPhotoInput && teamPhotoInput.files[0]) {
            pendingReads++;
            const reader = new FileReader();
            reader.onload = function(e) {
                team.photos.team = e.target.result;
                console.log('📷 Foto de equipo cargada');
                checkComplete();
            };
            reader.readAsDataURL(teamPhotoInput.files[0]);
        }
        
        if (player1PhotoInput && player1PhotoInput.files[0]) {
            pendingReads++;
            const reader = new FileReader();
            reader.onload = function(e) {
                team.photos.player1 = e.target.result;
                console.log('📷 Foto de jugador 1 cargada');
                checkComplete();
            };
            reader.readAsDataURL(player1PhotoInput.files[0]);
        }
        
        if (player2PhotoInput && player2PhotoInput.files[0]) {
            pendingReads++;
            const reader = new FileReader();
            reader.onload = function(e) {
                team.photos.player2 = e.target.result;
                console.log('📷 Foto de jugador 2 cargada');
                checkComplete();
            };
            reader.readAsDataURL(player2PhotoInput.files[0]);
        }
        
        // Si no hay archivos para leer, resolver inmediatamente
        if (pendingReads === 0) {
            resolve();
        }
    });
}

// Crear placeholder atractivo para equipos sin foto
function createTeamPlaceholder(teamName) {
    const colors = ['#ff6b35', '#f7931e', '#ffcc02', '#2196f3', '#9c27b0', '#4caf50'];
    const color = colors[teamName.length % colors.length];
    const initials = teamName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
    
    const svg = `
        <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad${teamName.replace(/\s/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color}88;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#grad${teamName.replace(/\s/g, '')})" rx="8"/>
            <circle cx="50" cy="35" r="12" fill="white" opacity="0.9"/>
            <path d="M30 65 Q30 55 40 55 L60 55 Q70 55 70 65 L70 75 Q70 80 65 80 L35 80 Q30 80 30 75 Z" fill="white" opacity="0.9"/>
            <text x="50" y="95" font-family="'Press Start 2P', monospace" font-size="8" fill="white" text-anchor="middle" font-weight="bold">${initials}</text>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

function loadTeams() {
    const container = document.getElementById('registered-teams');
    if (!container) return;
    
    console.log('loadTeams() - Equipos actuales:', teams);
    
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
        // Crear una imagen placeholder más atractiva si no hay foto
        const teamPhoto = team.photos?.team || createTeamPlaceholder(team.name);
        
        html += `
            <div class="team-card-custom">
                <div class="team-photo">
                    <img src="${teamPhoto}" alt="${team.name}" onerror="this.src='${createTeamPlaceholder(team.name)}'">
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
                <div class="team-actions">
                    <button onclick="showTeamModal(${team.id})" class="info-btn">
                        📋 Info
                    </button>
                    <button onclick="removeTeam(${team.id})" class="remove-btn" ${tournamentState === 'active' ? 'disabled' : ''}>
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function showTeamModal(teamId) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    // Crear el modal
    const modal = document.createElement('div');
    modal.id = 'team-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-in-out;
    `;
    
    // Obtener foto del equipo
    const teamPhoto = team.photos?.team || createTeamPlaceholder(team.name);
    const stats = team.stats || { played: 0, won: 0, lost: 0, points: 0 };
    
    // Contenido del modal
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-medium) 100%);
            padding: 2rem;
            border-radius: 15px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            border: 2px solid var(--primary-color);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
        ">
            <button onclick="closeTeamModal()" style="
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                color: var(--text-light);
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
            ">×</button>
            
            <h2 style="
                color: var(--primary-color);
                margin-bottom: 1rem;
                font-size: 1.3rem;
            ">📋 Información del Equipo</h2>
            
            <div style="margin-bottom: 1.5rem;">
                <img src="${teamPhoto}" style="
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid var(--accent-color);
                    margin-bottom: 1rem;
                ">
                
                <h3 style="
                    color: var(--accent-color);
                    margin-bottom: 0.5rem;
                    font-size: 1.1rem;
                ">${team.name}</h3>
                
                <p style="
                    color: var(--secondary-color);
                    margin-bottom: 1rem;
                ">${team.players.join(' & ')}</p>
            </div>
            
            <div style="
                background: var(--bg-light);
                padding: 1rem;
                border-radius: 10px;
                margin-bottom: 1.5rem;
                border: 1px solid var(--secondary-color);
            ">
                <h4 style="color: var(--accent-color); margin-bottom: 0.8rem;">📊 Estadísticas</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
                    <div>🎮 Partidas: <strong>${stats.played}</strong></div>
                    <div>🏆 Victorias: <strong>${stats.won}</strong></div>
                    <div>💔 Derrotas: <strong>${stats.lost}</strong></div>
                    <div>⭐ Puntos: <strong>${stats.points}</strong></div>
                </div>
                ${stats.played > 0 ? `
                    <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid var(--secondary-color);">
                        <div>📈 Ratio Victoria: <strong>${((stats.won / stats.played) * 100).toFixed(1)}%</strong></div>
                    </div>
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="closeTeamModal()" style="
                    background: var(--secondary-color);
                    color: white;
                    border: none;
                    padding: 0.8rem 1.5rem;
                    border-radius: var(--border-radius);
                    font-family: 'Press Start 2P', monospace;
                    font-size: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    ✅ CERRAR
                </button>
                
                ${tournamentState !== 'active' ? `
                    <button onclick="editTeam(${team.id})" style="
                        background: var(--info-color, #17a2b8);
                        color: white;
                        border: none;
                        padding: 0.8rem 1.5rem;
                        border-radius: var(--border-radius);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        ✏️ EDITAR
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeTeamModal() {
    const modal = document.getElementById('team-modal');
    if (modal) {
        modal.remove();
    }
}

function editTeam(teamId) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    closeTeamModal();
    
    // Crear modal de edición
    const modal = document.createElement('div');
    modal.id = 'edit-team-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-in-out;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-medium) 100%);
            padding: 2rem;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            border: 2px solid var(--primary-color);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
        ">
            <button onclick="closeEditTeamModal()" style="
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                color: var(--text-light);
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
            ">×</button>
            
            <h2 style="
                color: var(--primary-color);
                margin-bottom: 1.5rem;
                font-size: 1.3rem;
                text-align: center;
            ">✏️ Editar Equipo</h2>
            
            <form id="edit-team-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">
                        Nombre del Equipo:
                    </label>
                    <input type="text" id="edit-team-name" value="${team.name}" style="
                        width: 100%;
                        padding: 0.8rem;
                        border: 2px solid var(--primary-color);
                        border-radius: var(--border-radius);
                        background: var(--bg-light);
                        color: var(--text-primary);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 10px;
                    ">
                </div>
                
                <div>
                    <label style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">
                        Jugador 1:
                    </label>
                    <input type="text" id="edit-player1-name" value="${team.players[0]}" style="
                        width: 100%;
                        padding: 0.8rem;
                        border: 2px solid var(--primary-color);
                        border-radius: var(--border-radius);
                        background: var(--bg-light);
                        color: var(--text-primary);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 10px;
                    ">
                </div>
                
                <div>
                    <label style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">
                        Jugador 2:
                    </label>
                    <input type="text" id="edit-player2-name" value="${team.players[1]}" style="
                        width: 100%;
                        padding: 0.8rem;
                        border: 2px solid var(--primary-color);
                        border-radius: var(--border-radius);
                        background: var(--bg-light);
                        color: var(--text-primary);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 10px;
                    ">
                </div>
                
                <div>
                    <label style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">
                        Foto del Equipo (opcional):
                    </label>
                    <input type="file" id="edit-team-photo" accept="image/*" style="
                        width: 100%;
                        padding: 0.5rem;
                        border: 2px solid var(--primary-color);
                        border-radius: var(--border-radius);
                        background: var(--bg-light);
                        color: var(--text-primary);
                        font-size: 10px;
                    ">
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
                    <button type="button" onclick="saveTeamEdits(${team.id})" style="
                        background: var(--success-color);
                        color: white;
                        border: none;
                        padding: 0.8rem 1.5rem;
                        border-radius: var(--border-radius);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        💾 GUARDAR
                    </button>
                    
                    <button type="button" onclick="closeEditTeamModal()" style="
                        background: var(--secondary-color);
                        color: white;
                        border: none;
                        padding: 0.8rem 1.5rem;
                        border-radius: var(--border-radius);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        ❌ CANCELAR
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeEditTeamModal() {
    const modal = document.getElementById('edit-team-modal');
    if (modal) {
        modal.remove();
    }
}

async function saveTeamEdits(teamId) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    const newName = document.getElementById('edit-team-name').value.trim();
    const newPlayer1 = document.getElementById('edit-player1-name').value.trim();
    const newPlayer2 = document.getElementById('edit-player2-name').value.trim();
    
    if (!newName || !newPlayer1 || !newPlayer2) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }
    
    // Verificar que el nombre no esté en uso por otro equipo
    const existingTeam = teams.find(t => t.id !== teamId && t.name.toLowerCase() === newName.toLowerCase());
    if (existingTeam) {
        alert('Ya existe otro equipo con ese nombre');
        return;
    }
    
    // Actualizar datos básicos
    team.name = newName;
    team.players = [newPlayer1, newPlayer2];
    
    // Manejar nueva foto si se seleccionó
    const photoInput = document.getElementById('edit-team-photo');
    if (photoInput && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            team.photos.team = e.target.result;
            localStorage.setItem('tournament-teams', JSON.stringify(teams));
            loadTeams();
        };
        reader.readAsDataURL(photoInput.files[0]);
    }
    
    // Guardar cambios
    localStorage.setItem('tournament-teams', JSON.stringify(teams));
    
    // Actualizar interfaz
    loadTeams();
    updateTournamentInfo();
    generateBrackets();
    
    closeEditTeamModal();
    alert(`✅ Equipo "${newName}" actualizado exitosamente!`);
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
    const container = document.getElementById('games-grid');
    if (!container) return;
    
    if (games.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; opacity: 0.7;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎮</div>
                <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">No hay juegos registrados</p>
                <p style="font-size: 10px; margin-top: 1rem;">Usa el formulario de arriba para agregar juegos al torneo</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="games-header">
            <p class="games-count">🎮 Juegos Disponibles (${games.length})</p>
        </div>
        <div class="games-grid-custom">
    `;
    
    games.forEach(game => {
        html += `
            <div class="game-card" onclick="showGameModal(${game.id})" style="cursor: pointer;">
                <div class="game-header">
                    <div class="game-emoji">${game.emoji}</div>
                </div>
                <div class="game-info">
                    <h4 class="game-name">${game.name}</h4>
                    <p class="game-click-hint">Click para ver detalles</p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function addGame() {
    const gameName = document.getElementById('game-name').value.trim();
    const gameEmoji = document.getElementById('game-emoji').value;
    const gameRules = document.getElementById('game-rules').value.trim();
    
    if (!gameName) {
        alert('El nombre del juego es obligatorio');
        return;
    }
    
    if (!gameEmoji) {
        alert('Debes seleccionar un emoji para el juego');
        return;
    }
    
    if (games.find(game => game.name.toLowerCase() === gameName.toLowerCase())) {
        alert('Ya existe un juego con ese nombre');
        return;
    }
    
    const newGame = {
        id: Date.now(),
        name: gameName,
        emoji: gameEmoji,
        rules: gameRules || null
    };
    
    console.log('🎮 Nuevo juego agregado:', newGame);
    
    games.push(newGame);
    localStorage.setItem('tournament-games', JSON.stringify(games));
    document.getElementById('game-form').reset();
    loadGames();
    alert('Juego "' + gameName + '" agregado exitosamente!');
}

function showGameModal(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Crear el modal
    const modal = document.createElement('div');
    modal.id = 'game-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-in-out;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-medium) 100%);
            padding: 2rem;
            border-radius: 15px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            border: 2px solid var(--primary-color);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
        ">
            <button onclick="closeGameModal()" style="
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                color: var(--text-light);
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
            ">×</button>
            
            <div style="margin-bottom: 1.5rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${game.emoji}</div>
                <h2 style="
                    color: var(--primary-color);
                    margin-bottom: 1rem;
                    font-size: 1.5rem;
                ">${game.name}</h2>
            </div>
            
            ${game.rules ? `
                <div style="
                    background: var(--bg-light);
                    padding: 1.5rem;
                    border-radius: 10px;
                    margin-bottom: 2rem;
                    border: 1px solid var(--secondary-color);
                    text-align: left;
                ">
                    <h3 style="color: var(--accent-color); margin-bottom: 1rem; text-align: center;">📋 Reglas del Juego</h3>
                    <p style="
                        color: var(--text-primary);
                        line-height: 1.6;
                        font-size: 0.9rem;
                        margin: 0;
                        white-space: pre-wrap;
                    ">${game.rules}</p>
                </div>
            ` : `
                <div style="
                    background: var(--bg-light);
                    padding: 1.5rem;
                    border-radius: 10px;
                    margin-bottom: 2rem;
                    border: 1px solid var(--secondary-color);
                ">
                    <p style="
                        color: var(--text-light);
                        font-style: italic;
                        opacity: 0.7;
                        margin: 0;
                    ">Este juego no tiene reglas específicas definidas</p>
                </div>
            `}
            
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button onclick="closeGameModal()" style="
                    background: var(--secondary-color);
                    color: white;
                    border: none;
                    padding: 0.8rem 1.5rem;
                    border-radius: var(--border-radius);
                    font-family: 'Press Start 2P', monospace;
                    font-size: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    ✅ CERRAR
                </button>
                
                ${tournamentState !== 'active' ? `
                    <button onclick="editGameFromModal(${game.id})" style="
                        background: var(--info-color, #17a2b8);
                        color: white;
                        border: none;
                        padding: 0.8rem 1.5rem;
                        border-radius: var(--border-radius);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        ✏️ EDITAR
                    </button>
                    
                    <button onclick="removeGameFromModal(${game.id})" style="
                        background: var(--danger-color, #dc3545);
                        color: white;
                        border: none;
                        padding: 0.8rem 1.5rem;
                        border-radius: var(--border-radius);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        🗑️ ELIMINAR
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeGameModal() {
    const modal = document.getElementById('game-modal');
    if (modal) {
        modal.remove();
    }
}

function editGameFromModal(gameId) {
    closeGameModal();
    editGame(gameId);
}

function removeGameFromModal(gameId) {
    closeGameModal();
    removeGame(gameId);
}

function editGame(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Crear modal de edición
    const modal = document.createElement('div');
    modal.id = 'edit-game-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-in-out;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-medium) 100%);
            padding: 2rem;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            border: 2px solid var(--info-color, #17a2b8);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
        ">
            <button onclick="closeEditGameModal()" style="
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                color: var(--text-light);
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
            ">×</button>
            
            <h2 style="
                color: var(--info-color, #17a2b8);
                margin-bottom: 1.5rem;
                font-size: 1.3rem;
                text-align: center;
            ">🎮 Editar Juego</h2>
            
            <form id="edit-game-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">
                        Nombre del Juego:
                    </label>
                    <input type="text" id="edit-game-name" value="${game.name}" style="
                        width: 100%;
                        padding: 0.8rem;
                        border: 2px solid var(--info-color, #17a2b8);
                        border-radius: var(--border-radius);
                        background: var(--bg-light);
                        color: var(--text-primary);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 10px;
                    ">
                </div>
                
                <div>
                    <label style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">
                        Emoji:
                    </label>
                    <select id="edit-game-emoji" style="
                        width: 100%;
                        padding: 0.8rem;
                        border: 2px solid var(--info-color, #17a2b8);
                        border-radius: var(--border-radius);
                        background: var(--bg-light);
                        color: var(--text-primary);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 10px;
                    ">
                        <optgroup label="🥊 Peleas">
                            <option value="🥊" ${game.emoji === '🥊' ? 'selected' : ''}>🥊 Boxeo</option>
                            <option value="👊" ${game.emoji === '👊' ? 'selected' : ''}>👊 Puño</option>
                            <option value="🥋" ${game.emoji === '🥋' ? 'selected' : ''}>🥋 Artes Marciales</option>
                            <option value="⚡" ${game.emoji === '⚡' ? 'selected' : ''}>⚡ Energía</option>
                            <option value="💥" ${game.emoji === '💥' ? 'selected' : ''}>💥 Explosión</option>
                            <option value="🔥" ${game.emoji === '🔥' ? 'selected' : ''}>🔥 Fuego</option>
                            <option value="⚔️" ${game.emoji === '⚔️' ? 'selected' : ''}>⚔️ Espadas</option>
                            <option value="🛡️" ${game.emoji === '🛡️' ? 'selected' : ''}>🛡️ Escudo</option>
                        </optgroup>
                        <optgroup label="🏎️ Carreras">
                            <option value="🏎️" ${game.emoji === '🏎️' ? 'selected' : ''}>🏎️ Fórmula 1</option>
                            <option value="🚗" ${game.emoji === '🚗' ? 'selected' : ''}>🚗 Auto</option>
                            <option value="🏍️" ${game.emoji === '🏍️' ? 'selected' : ''}>🏍️ Moto</option>
                            <option value="🚲" ${game.emoji === '🚲' ? 'selected' : ''}>🚲 Bicicleta</option>
                            <option value="🛻" ${game.emoji === '🛻' ? 'selected' : ''}>🛻 Camioneta</option>
                            <option value="🚁" ${game.emoji === '🚁' ? 'selected' : ''}>🚁 Helicóptero</option>
                            <option value="✈️" ${game.emoji === '✈️' ? 'selected' : ''}>✈️ Avión</option>
                            <option value="🚀" ${game.emoji === '🚀' ? 'selected' : ''}>🚀 Cohete</option>
                        </optgroup>
                        <optgroup label="⚽ Deportes">
                            <option value="⚽" ${game.emoji === '⚽' ? 'selected' : ''}>⚽ Fútbol</option>
                            <option value="🏀" ${game.emoji === '🏀' ? 'selected' : ''}>🏀 Básquet</option>
                            <option value="🏈" ${game.emoji === '🏈' ? 'selected' : ''}>🏈 Fútbol Americano</option>
                            <option value="⚾" ${game.emoji === '⚾' ? 'selected' : ''}>⚾ Béisbol</option>
                            <option value="🎾" ${game.emoji === '🎾' ? 'selected' : ''}>🎾 Tenis</option>
                            <option value="🏐" ${game.emoji === '🏐' ? 'selected' : ''}>🏐 Voleibol</option>
                            <option value="🏓" ${game.emoji === '🏓' ? 'selected' : ''}>🏓 Ping Pong</option>
                            <option value="🥅" ${game.emoji === '🥅' ? 'selected' : ''}>🥅 Portería</option>
                        </optgroup>
                        <optgroup label="🎮 Gaming">
                            <option value="🎮" ${game.emoji === '🎮' ? 'selected' : ''}>🎮 Control</option>
                            <option value="🕹️" ${game.emoji === '🕹️' ? 'selected' : ''}>🕹️ Joystick</option>
                            <option value="👾" ${game.emoji === '👾' ? 'selected' : ''}>👾 Alien</option>
                            <option value="🤖" ${game.emoji === '🤖' ? 'selected' : ''}>🤖 Robot</option>
                            <option value="🎯" ${game.emoji === '🎯' ? 'selected' : ''}>🎯 Diana</option>
                            <option value="🎲" ${game.emoji === '🎲' ? 'selected' : ''}>🎲 Dado</option>
                            <option value="🃏" ${game.emoji === '🃏' ? 'selected' : ''}>🃏 Cartas</option>
                            <option value="🎪" ${game.emoji === '🎪' ? 'selected' : ''}>🎪 Circo</option>
                        </optgroup>
                        <optgroup label="🏆 Competencia">
                            <option value="🏆" ${game.emoji === '🏆' ? 'selected' : ''}>🏆 Trofeo</option>
                            <option value="🥇" ${game.emoji === '🥇' ? 'selected' : ''}>🥇 Oro</option>
                            <option value="🥈" ${game.emoji === '🥈' ? 'selected' : ''}>🥈 Plata</option>
                            <option value="🥉" ${game.emoji === '🥉' ? 'selected' : ''}>🥉 Bronce</option>
                            <option value="🏅" ${game.emoji === '🏅' ? 'selected' : ''}>🏅 Medalla</option>
                            <option value="⭐" ${game.emoji === '⭐' ? 'selected' : ''}>⭐ Estrella</option>
                            <option value="🌟" ${game.emoji === '🌟' ? 'selected' : ''}>🌟 Estrella Brillante</option>
                            <option value="💎" ${game.emoji === '💎' ? 'selected' : ''}>💎 Diamante</option>
                        </optgroup>
                    </select>
                </div>
                
                <div>
                    <label style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">
                        Reglas (opcional):
                    </label>
                    <textarea id="edit-game-rules" rows="4" style="
                        width: 100%;
                        padding: 0.8rem;
                        border: 2px solid var(--info-color, #17a2b8);
                        border-radius: var(--border-radius);
                        background: var(--bg-light);
                        color: var(--text-primary);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                        resize: vertical;
                    ">${game.rules || ''}</textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
                    <button type="button" onclick="saveGameEdits(${game.id})" style="
                        background: var(--success-color);
                        color: white;
                        border: none;
                        padding: 0.8rem 1.5rem;
                        border-radius: var(--border-radius);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        💾 GUARDAR
                    </button>
                    
                    <button type="button" onclick="closeEditGameModal()" style="
                        background: var(--secondary-color);
                        color: white;
                        border: none;
                        padding: 0.8rem 1.5rem;
                        border-radius: var(--border-radius);
                        font-family: 'Press Start 2P', monospace;
                        font-size: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        ❌ CANCELAR
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeEditGameModal() {
    const modal = document.getElementById('edit-game-modal');
    if (modal) {
        modal.remove();
    }
}

function saveGameEdits(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const newName = document.getElementById('edit-game-name').value.trim();
    const newEmoji = document.getElementById('edit-game-emoji').value;
    const newRules = document.getElementById('edit-game-rules').value.trim();
    
    if (!newName) {
        alert('El nombre del juego es obligatorio');
        return;
    }
    
    if (!newEmoji) {
        alert('Debes seleccionar un emoji para el juego');
        return;
    }
    
    // Verificar que el nombre no esté en uso por otro juego
    const existingGame = games.find(g => g.id !== gameId && g.name.toLowerCase() === newName.toLowerCase());
    if (existingGame) {
        alert('Ya existe otro juego con ese nombre');
        return;
    }
    
    // Actualizar datos
    game.name = newName;
    game.emoji = newEmoji;
    game.rules = newRules || null;
    
    // Guardar cambios
    localStorage.setItem('tournament-games', JSON.stringify(games));
    
    // Actualizar interfaz
    loadGames();
    
    closeEditGameModal();
    alert(`✅ Juego "${newName}" actualizado exitosamente!`);
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
                <strong>Sistema de puntos:</strong> 3 puntos por victoria únicamente
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
            team.stats = { played: 0, won: 0, lost: 0, points: 0 };
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
    loadChatSidebar();
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
    
    const recentMessages = chatMessages.slice(-50);
    
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
    
    const recentMessages = chatMessages.slice(-50);
    
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
    loadChatMessages();
    
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
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatMessage);
    }
    
    const chatFormSidebar = document.getElementById('chat-form-sidebar');
    if (chatFormSidebar) {
        chatFormSidebar.addEventListener('submit', handleChatMessageSidebar);
    }
    
    const teamForm = document.getElementById('team-form');
    if (teamForm) {
        teamForm.addEventListener('submit', (e) => {
            e.preventDefault();
            registerTeam();
        });
    }
    
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
    console.log('Inicializando aplicacion...');
    
    try {
        initializeApp();
        setupEventListeners();
        loadGames();
        loadTeams();
        initializeChatSidebar();
        updateTournamentInfo();
        updateTournamentControls();
        
        setTimeout(() => {
            generateBrackets();
            updateLeaderboard();
        }, 100);
        
        console.log('Aplicacion inicializada correctamente');
        
    } catch (error) {
        console.error('Error durante la inicializacion:', error);
        alert('Error al cargar la aplicacion.');
    }
});

// ===== FUNCIONES DE CONTROL DEL TORNEO =====

/**
 * Función para limpiar datos del torneo de forma controlada
 * Mantiene la configuración básica pero limpia resultados y estado
 */
function cleanTournamentData() {
    // Confirmar acción con el usuario
    const confirmClean = confirm(
        '🧹 LIMPIAR DATOS DEL TORNEO\n\n' +
        'Esta acción eliminará:\n' +
        '• Resultados de partidas\n' +
        '• Estado del torneo actual\n' +
        '• Brackets generados\n\n' +
        'SE MANTENDRÁN:\n' +
        '• Equipos registrados\n' +
        '• Juegos configurados\n' +
        '• Mensajes del chat\n\n' +
        '¿Continuar?'
    );
    
    if (!confirmClean) return;
    
    try {
        // Limpiar estado del torneo pero mantener datos básicos
        tournamentState = 'preparing';
        currentBracket = null;
        bracketVisualizer = null;
        
        // Guardar cambios en localStorage
        localStorage.setItem('tournament-state', tournamentState);
        localStorage.removeItem('tournament-bracket');
        localStorage.removeItem('tournament-bracket-visualizer');
        
        // Actualizar interfaz
        updateTournamentStatus();
        generateBrackets();
        updateLeaderboard();
        
        // Notificar éxito
        alert('✅ Datos del torneo limpiados correctamente\n\nEl torneo está listo para comenzar de nuevo');
        
        console.log('✅ Datos del torneo limpiados - Estado: preparing');
        
    } catch (error) {
        console.error('❌ Error al limpiar datos:', error);
        alert('❌ Error al limpiar los datos del torneo\n\nRevisa la consola para más detalles');
    }
}

/**
 * Función de emergencia para reseteo completo del sistema
 * Elimina TODOS los datos y reinicia la aplicación
 */
function emergencyReset() {
    // Doble confirmación para acción crítica
    const firstConfirm = confirm(
        '🚨 RESETEO DE EMERGENCIA 🚨\n\n' +
        '⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE\n\n' +
        'Se eliminarán TODOS los datos:\n' +
        '• Equipos registrados\n' +
        '• Juegos personalizados\n' +
        '• Resultados y brackets\n' +
        '• Mensajes del chat\n' +
        '• Configuraciones\n\n' +
        '¿Estás SEGURO de continuar?'
    );
    
    if (!firstConfirm) return;
    
    const secondConfirm = confirm(
        '🚨 CONFIRMACIÓN FINAL 🚨\n\n' +
        'Esta es tu última oportunidad para cancelar.\n\n' +
        'Se perderán TODOS los datos del torneo.\n\n' +
        '¿Proceder con el reseteo de emergencia?'
    );
    
    if (!secondConfirm) return;
    
    try {
        // Limpiar completamente localStorage
        const keysToRemove = [
            'tournament-teams',
            'tournament-games', 
            'tournament-chat',
            'tournament-state',
            'tournament-bracket',
            'tournament-bracket-visualizer'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Resetear variables globales a estado inicial
        teams = [];
        games = [
            { id: 1, name: 'Mario Kart', emoji: '🏎️', rules: 'Carrera de 4 vueltas. Gana el primero en llegar a la meta.' },
            { id: 2, name: 'Super Smash Bros', emoji: '👊', rules: 'Mejor de 3 rounds. Sin items. Escenarios neutrales.' },
            { id: 3, name: 'Marvel vs Capcom 3', emoji: '⚡', rules: 'Mejor de 5 rounds. Equipos de 3 personajes.' },
            { id: 4, name: 'Mario Party', emoji: '🎲', rules: '10 turnos. Gana quien tenga más estrellas al final.' },
            { id: 5, name: 'Street Fighter', emoji: '🥊', rules: 'Mejor de 5 rounds. Sin super meter inicial.' },
            { id: 6, name: 'Tekken 7', emoji: '🥋', rules: 'Mejor de 3 rounds. Sin rage arts iniciales.' },
            { id: 7, name: 'Rocket League', emoji: '⚽', rules: '5 minutos. Gana quien tenga más goles.' }
        ];
        chatMessages = [];
        tournamentState = 'preparing';
        currentBracket = null;
        bracketVisualizer = null;
        
        // Guardar estado inicial en localStorage
        localStorage.setItem('tournament-games', JSON.stringify(games));
        localStorage.setItem('tournament-state', tournamentState);
        
        // Recargar completamente la interfaz
        loadTeams();
        loadGames();
        loadChatMessages();
        updateTournamentStatus();
        generateBrackets();
        updateLeaderboard();
        
        // Notificar éxito
        alert('🚨 RESETEO DE EMERGENCIA COMPLETADO 🚨\n\n✅ Todos los datos han sido eliminados\n✅ Sistema reiniciado correctamente\n\nLa aplicación está lista para usar desde cero');
        
        console.log('🚨 Reseteo de emergencia completado - Sistema reiniciado');
        
    } catch (error) {
        console.error('❌ Error en reseteo de emergencia:', error);
        alert('❌ Error durante el reseteo de emergencia\n\nPuede ser necesario limpiar manualmente el caché del navegador');
    }
}

console.log('Sistema unificado cargado correctamente');
