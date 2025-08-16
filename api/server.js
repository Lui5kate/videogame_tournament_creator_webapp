const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Crear/conectar base de datos
const dbPath = path.join(__dirname, 'tournament.db');
const db = new sqlite3.Database(dbPath);

// Inicializar tablas
db.serialize(() => {
    // Tabla de torneos
    db.run(`CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla de equipos
    db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER,
        name TEXT NOT NULL,
        player1 TEXT NOT NULL,
        player2 TEXT NOT NULL,
        photo TEXT,
        points INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )`);
    
    // Tabla de juegos
    db.run(`CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER,
        name TEXT NOT NULL,
        emoji TEXT,
        rules TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )`);
    
    // Tabla de mensajes de chat
    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER,
        username TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )`);
    
    // Tabla de partidas
    db.run(`CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER,
        team1_id INTEGER,
        team2_id INTEGER,
        game_id INTEGER,
        winner_id INTEGER,
        status TEXT DEFAULT 'pending',
        bracket_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
        FOREIGN KEY (team1_id) REFERENCES teams (id),
        FOREIGN KEY (team2_id) REFERENCES teams (id),
        FOREIGN KEY (game_id) REFERENCES games (id),
        FOREIGN KEY (winner_id) REFERENCES teams (id)
    )`);
});

// ===== RUTAS DE LA API =====

// Obtener o crear torneo por nombre
app.get('/api/tournament/:name', (req, res) => {
    const tournamentName = req.params.name;
    
    db.get('SELECT * FROM tournaments WHERE name = ?', [tournamentName], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (row) {
            res.json({
                id: row.id,
                name: row.name,
                data: JSON.parse(row.data),
                created_at: row.created_at,
                updated_at: row.updated_at
            });
        } else {
            // Crear nuevo torneo
            const initialData = {
                teams: [],
                games: [
                    { id: 1, name: 'Mario Kart', emoji: '🏎️', rules: 'Carrera de 4 vueltas. Gana el primero en llegar a la meta.' },
                    { id: 2, name: 'Super Smash Bros', emoji: '👊', rules: 'Mejor de 3 rounds. Sin items. Escenarios neutrales.' },
                    { id: 3, name: 'Marvel vs Capcom 3', emoji: '⚡', rules: 'Mejor de 5 rounds. Equipos de 3 personajes.' },
                    { id: 4, name: 'Mario Party', emoji: '🎲', rules: '10 turnos. Gana quien tenga más estrellas al final.' },
                    { id: 5, name: 'Street Fighter', emoji: '🥊', rules: 'Mejor de 5 rounds. Sin super meter inicial.' },
                    { id: 6, name: 'Tekken 7', emoji: '🥋', rules: 'Mejor de 3 rounds. Sin rage arts iniciales.' },
                    { id: 7, name: 'Rocket League', emoji: '⚽', rules: '5 minutos. Gana quien tenga más goles.' }
                ],
                chatMessages: [],
                tournamentState: 'preparing',
                bracket: null
            };
            
            db.run('INSERT INTO tournaments (name, data) VALUES (?, ?)', 
                [tournamentName, JSON.stringify(initialData)], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    res.json({
                        id: this.lastID,
                        name: tournamentName,
                        data: initialData,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                });
        }
    });
});

// Actualizar datos del torneo
app.put('/api/tournament/:name', (req, res) => {
    const tournamentName = req.params.name;
    const tournamentData = req.body;
    
    db.run('UPDATE tournaments SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
        [JSON.stringify(tournamentData), tournamentName],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Torneo no encontrado' });
            }
            
            res.json({ 
                success: true, 
                message: 'Torneo actualizado correctamente',
                updated_at: new Date().toISOString()
            });
        });
});

// Obtener equipos del torneo
app.get('/api/tournament/:name/teams', (req, res) => {
    const tournamentName = req.params.name;
    
    db.get('SELECT id FROM tournaments WHERE name = ?', [tournamentName], (err, tournament) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }
        
        db.all('SELECT * FROM teams WHERE tournament_id = ? ORDER BY points DESC, wins DESC', 
            [tournament.id], (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows);
            });
    });
});

// Agregar equipo
app.post('/api/tournament/:name/teams', (req, res) => {
    const tournamentName = req.params.name;
    const { name, player1, player2, photo } = req.body;
    
    db.get('SELECT id FROM tournaments WHERE name = ?', [tournamentName], (err, tournament) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }
        
        db.run('INSERT INTO teams (tournament_id, name, player1, player2, photo) VALUES (?, ?, ?, ?, ?)',
            [tournament.id, name, player1, player2, photo],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                res.json({
                    id: this.lastID,
                    tournament_id: tournament.id,
                    name,
                    player1,
                    player2,
                    photo,
                    points: 0,
                    wins: 0,
                    losses: 0
                });
            });
    });
});

// Obtener mensajes de chat
app.get('/api/tournament/:name/chat', (req, res) => {
    const tournamentName = req.params.name;
    
    db.get('SELECT id FROM tournaments WHERE name = ?', [tournamentName], (err, tournament) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }
        
        db.all('SELECT * FROM chat_messages WHERE tournament_id = ? ORDER BY timestamp ASC', 
            [tournament.id], (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows);
            });
    });
});

// Agregar mensaje de chat
app.post('/api/tournament/:name/chat', (req, res) => {
    const tournamentName = req.params.name;
    const { username, message } = req.body;
    
    db.get('SELECT id FROM tournaments WHERE name = ?', [tournamentName], (err, tournament) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }
        
        db.run('INSERT INTO chat_messages (tournament_id, username, message) VALUES (?, ?, ?)',
            [tournament.id, username, message],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                res.json({
                    id: this.lastID,
                    tournament_id: tournament.id,
                    username,
                    message,
                    timestamp: new Date().toISOString()
                });
            });
    });
});

// Ruta de salud
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'API del torneo funcionando correctamente'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📊 Base de datos: ${dbPath}`);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    db.close((err) => {
        if (err) {
            console.error('❌ Error cerrando base de datos:', err.message);
        } else {
            console.log('✅ Base de datos cerrada correctamente');
        }
        process.exit(0);
    });
});
