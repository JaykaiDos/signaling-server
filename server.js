// server.js
const http = require('http').createServer();
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Permite conexiones desde cualquier dominio (tu web)
        methods: ["GET", "POST"]
    }
});

// Usar el puerto asignado por el entorno o el 3000 por defecto
const PORT = process.env.PORT || 3000;

io.on('connection', (socket) => {
    console.log('Jugador conectado:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Jugador ${socket.id} en sala: ${roomId}`);
    });

    socket.on('signal', (data) => {
        // Reenviar datos de conexión al otro par en la sala
        socket.to(data.roomId).emit('signal', data.signalData);
    });

    socket.on('disconnect', () => {
        console.log('Jugador desconectado');
    });
});

http.listen(PORT, () => {
    console.log(`Servidor de señalización activo en puerto ${PORT}`);
});