const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname + '/public')));

// Route to serve the login page
app.get('/', (_, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// Route to serve the room page
app.get('/room/:id', (_, res) => {
    res.sendFile(__dirname + '/public/room.html');
});

// Route to serve the gyro page
app.get('/gyro', (_, res) => {
    res.sendFile(__dirname + '/public/gyro.html');
});

// Object to keep track of rooms and their users
const rooms = {};

io.on("connection", (socket) => {
    socket.on("message", (message) => {
        console.log(`Message: ${message}`);
        // Broadcast the message to all connected clients except the one that sent the message
        socket.broadcast.emit("message", message);
    });

    socket.on('createRoom', () => {
        let ExistingRoom = true;
        while(ExistingRoom){
            const roomId = (Math.random() + 1).toString(36).substring(2);
            if(!rooms[roomId]){
                rooms[roomId] = { redUsers: [], blueUsers: []};
                socket.join(roomId);
                //randomly assign user to red or blue team
                if (Math.random() < 0.5) {
                    rooms[roomId].redUsers.push(socket.id);
                } else {
                    rooms[roomId].blueUsers.push(socket.id);
                }
                socket.emit('roomCreated', { roomId });
                console.log(`Room created with ID: ${roomId}`);
                ExistingRoom = false;
            }
        }
    });

    socket.on('joinRoom', (roomId) => {
        // check if this id has already joined and if so return
        for (const room in rooms) {
            if (rooms[room].redUsers.includes(socket.id) || rooms[room].blueUsers.includes(socket.id)) {
                socket.emit('roomJoined', { roomId: room });
                return;
            }
        }
        // Check if the room exists and has less than 4 users
        if (rooms[roomId] && rooms[roomId].redUsers.length + rooms[roomId].blueUsers.length < 4) {
            socket.join(roomId);
            // Assign user to red or blue team
            if (rooms[roomId].redUsers.length <= rooms[roomId].blueUsers.length) {
                rooms[roomId].redUsers.push(socket.id);
            } else {
                rooms[roomId].blueUsers.push(socket.id);
            }
            socket.emit('roomJoined', { roomId });
            console.log(`User joined room with ID: ${roomId}`);

            // Notify room if the game can start
            if (rooms[roomId].redUsers.length >= 1 && rooms[roomId].blueUsers.length >= 1) {
                io.to(roomId).emit('gameReady');
            }
        } else if (!rooms[roomId]) {
            socket.emit('roomNotFound');
            console.log(`Room not found: ${roomId}`);
        } else {
            socket.emit('roomFull');
            console.log(`Room full: ${roomId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        // Find and remove the user from the room
        for (const roomId in rooms) {
            const reduserIndex = rooms[roomId].redUsers.indexOf(socket.id);
            const blueuserIndex = rooms[roomId].blueUsers.indexOf(socket.id);
            if (reduserIndex !== -1) {
                rooms[roomId].redUsers.splice(reduserIndex, 1);
                if (rooms[roomId].redUsers.length < 1 || rooms[roomId].blueUsers.length < 1) {
                    io.to(roomId).emit('gameNotReady');
                }
            }
            else if (blueuserIndex !== -1) {
                rooms[roomId].blueUsers.splice(blueuserIndex, 1);
                if (rooms[roomId].redUsers.length < 1 || rooms[roomId].blueUsers.length < 1) {
                    io.to(roomId).emit('gameNotReady');
                }
                break;
            }
        }
    });
});

// Use a port that Vercel can dynamically assign
const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Server listening on port http://localhost:${port}`);
});

module.exports = app;
