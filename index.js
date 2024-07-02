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

// Route to serve the viewer page
app.get('/viewer/:id', (_, res) => {
    res.sendFile(__dirname + '/public/viewer.html');
});

// object to keep track of viewers/specators
const viewers = {};// { roomId: [socketId1, socketId2] }

// Object to keep track of rooms and their users
const rooms = {};
/**
 * rooms = {
 *    maze: [],
 *    Users: [
 *       user1: {
 *          id: 'socketId',
 *          position: { x: 0, y: 0 }
 *       }
 *    ]
 */

io.on("connection", (socket) => {
    // Log when a user connects
    socket.on("message", (message) => {
        console.log(`Message: ${message}`);
        // Broadcast the message to all connected clients except the one that sent the message
        socket.broadcast.emit("message", message);
    });

    // expected data = none
    socket.on('createRoom', () => {
        let ExistingRoom = true;
        while(ExistingRoom){
            const roomId = (Math.random() + 1).toString(36).substring(2);
            if(!rooms[roomId]){
                rooms[roomId] = { maze: [], Users: []};
                socket.join(roomId);
                socket.emit('roomCreated', { roomId });
                console.log(`Room created with ID: ${roomId}`);
                ExistingRoom = false;
            }
        }
    });

    // expected data = roomId
    socket.on('joinRoom', (roomId) => {
        // if roomid is not specified, return error
        if (!roomId) {
            socket.emit('roomNotFound');
            console.log('Room not found');
            return;
        }

        // Check if the room exists and has less than 4 users
        if (rooms[roomId] && rooms[roomId].Users.length < 4) {
            socket.join(roomId);
            rooms[roomId].Users.push({ id: socket.id, position: { x: 0, y: 0 } });
            socket.emit('roomJoined', { roomId });
            console.log(`User joined room with ID: ${roomId}`);

            // Notify room of players in the room
            io.to(roomId).emit('playersInRoom', { Users: rooms[roomId].Users });

            // Notify spectators of players in the room
            if (viewers[roomId]) {
                viewers[roomId].forEach(viewer => {
                    socket.to(viewer).emit('playersInRoom', { Users: rooms[roomId].Users});
                });
            }

            // Notify room if the game can start
            if (rooms[roomId].Users.length >= 2) {
                io.to(roomId).emit('gameReady');
            }
            else {
                io.to(roomId).emit('gameNotReady');
            }
        } else if (!rooms[roomId]) {
            socket.emit('roomNotFound');
            console.log(`Room not found: ${roomId}`);
        } else {
            socket.emit('roomFull');
            console.log(`Room full: ${roomId}`);
        }
    });

    // spectator joins room
    socket.on('joinRoomAsViewer', (roomId) => {
        // if roomid is not specified, return error
        if (!roomId) {
            socket.emit('roomNotFound');
            console.log('Room not found');
            return;
        }
        
        // if room exists, join as viewer
        if (rooms[roomId]) {
            socket.join(roomId);
            if (!viewers[roomId]) {
                viewers[roomId] = [];
            }
            viewers[roomId].push(socket.id);
            console.log(`Viewer joined room with ID: ${roomId}`);
            socket.emit('roomJoined', { roomId: roomId, team: 'spectator'});
            // notify spectator of players in the room
            socket.emit('playersInRoom', { Users: rooms[roomId].Users });
        }
        else {
            socket.emit('roomNotFound');
            console.log(`Room not found: ${roomId}`);
        }
    });

    socket.on('startGame', (roomId) => {
        // create maze
        rooms[roomId].maze = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 1, 0, 1, 0, 1],
            [1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ];

        // initialize positions of players on the maze
        rooms[roomId].Users.forEach(user => {
            user.position = { x: 1, y: 1 };
        });

        // emit gameStarted event and send maze and player positions
        io.to(roomId).emit('gameStarted', { maze: rooms[roomId].maze, Users: rooms[roomId].Users});

        // emit gameStarted event to viewers
        if (viewers[roomId]) {
            viewers[roomId].forEach(viewer => {
                socket.to(viewer).emit('gameStarted', { maze: [], Users: rooms[roomId].Users});
            });
        }
    });

    // expected data = { roomId, position: { x, y } }
    socket.on('updatePosition', (data) => {
        // Find the user in the room and update their position
        const user = rooms[data.roomId].Users.find(user => user.id === socket.id); // this may cause problems
        if (!user) {
            console.log('User not found');
            return;
        }
        user.position = data.position; // if js updates the reference or a copy of the object

        // Broadcast the updated positions to all users in the room except the one that sent the message
        socket.to(data.roomId).emit('updatePosition', data);
        // Broadcast the updated positions to all viewers in the room
        if (viewers[data.roomId]) {
            viewers[data.roomId].forEach(viewer => {
                socket.to(viewer).emit('updatePosition', data);
            });
        }
    });

    // expected data = none
    socket.on('disconnect', () => {
        console.log('User disconnected');
        
        // Remove the user from the room
        for (let roomId in rooms) {
            const userIndex = rooms[roomId].Users.findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                rooms[roomId].Users.splice(userIndex, 1);
                socket.to(roomId).emit('playersInRoom', { Users: rooms[roomId].Users });
                if (rooms[roomId].Users.length < 2) {
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
