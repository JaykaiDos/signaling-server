// server.js
const http = require('http');

// Creamos el servidor con una respuesta básica para el Health Check de Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Servidor de señalización funcionando correctamente');
});

const io = require('socket.io')(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Render usa el puerto 10000 por defecto
const PORT = process.env.PORT || 10000;

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

// IMPORTANTE: Escuchar en '0.0.0.0' para que Render detecte el puerto
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de señalización activo en puerto ${PORT}`);
});
