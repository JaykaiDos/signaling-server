// server.js - Servidor de Señalización para Pokémon Quetzal Netplay
const http = require('http').createServer();
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // En producción, especifica tu dominio
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

const PORT = process.env.PORT || 3000;

// Almacenar información de salas activas
const rooms = new Map();

io.on('connection', (socket) => {
    console.log(`✅ Jugador conectado: ${socket.id}`);

    // Un jugador quiere unirse a una sala
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`🎮 Jugador ${socket.id} se unió a sala: ${roomId}`);

        // Registrar la sala si no existe
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                host: socket.id,
                clients: [],
                createdAt: Date.now()
            });
            console.log(`🏠 Nueva sala creada: ${roomId}`);
        } else {
            // Agregar cliente a la sala
            const room = rooms.get(roomId);
            room.clients.push(socket.id);
            
            // Notificar al host que alguien se unió
            io.to(room.host).emit('user-joined', {
                userId: socket.id,
                timestamp: Date.now()
            });
            
            console.log(`👥 Sala ${roomId} ahora tiene ${room.clients.length + 1} jugadores`);
        }

        // Enviar lista de jugadores en la sala
        const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
        const playerCount = socketsInRoom ? socketsInRoom.size : 0;
        
        socket.emit('room-joined', {
            roomId: roomId,
            playerCount: playerCount,
            timestamp: Date.now()
        });
    });

    // Manejar señales WebRTC
    socket.on('signal', (data) => {
        console.log(`📡 Señal recibida de ${socket.id} para sala ${data.roomId}`);
        
        // Reenviar la señal a todos los demás en la sala
        socket.to(data.roomId).emit('signal', data.signalData);
    });

    // Manejar estado del juego (del host a clientes)
    socket.on('game-state', (data) => {
        // Reenviar estado solo a la sala específica
        socket.to(data.roomId).emit('game-state', data.state);
    });

    // Manejar inputs de jugadores (de clientes al host)
    socket.on('player-input', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            // Enviar input solo al host
            io.to(room.host).emit('player-input', {
                playerId: socket.id,
                input: data.input
            });
        }
    });

    // Desconexión
    socket.on('disconnect', () => {
        console.log(`❌ Jugador desconectado: ${socket.id}`);
        
        // Limpiar salas
        rooms.forEach((room, roomId) => {
            if (room.host === socket.id) {
                // Si el host se desconecta, cerrar la sala
                console.log(`🏠 Sala ${roomId} cerrada (host desconectado)`);
                io.to(roomId).emit('host-disconnected');
                rooms.delete(roomId);
            } else {
                // Remover cliente de la sala
                room.clients = room.clients.filter(id => id !== socket.id);
                
                // Notificar al host
                io.to(room.host).emit('user-left', {
                    userId: socket.id
                });
            }
        });
    });

    // Heartbeat para mantener conexión activa
    socket.on('ping', () => {
        socket.emit('pong');
    });
});

// Limpieza periódica de salas viejas (más de 2 horas)
setInterval(() => {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    
    rooms.forEach((room, roomId) => {
        if (now - room.createdAt > TWO_HOURS) {
            console.log(`🧹 Limpiando sala inactiva: ${roomId}`);
            io.to(roomId).emit('room-closed');
            rooms.delete(roomId);
        }
    });
}, 30 * 60 * 1000); // Cada 30 minutos

http.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║  🎮 SERVIDOR DE SEÑALIZACIÓN ACTIVO       ║
║  Puerto: ${PORT}                           ║
║  Tiempo: ${new Date().toLocaleString()}   ║
╚═══════════════════════════════════════════╝
    `);
});

// Manejo de errores
process.on('uncaughtException', (err) => {
    console.error('❌ Error no capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
});
