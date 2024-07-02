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
 *    blueUsers: [
 *       user1: {
 *          id: 'socketId',
 *          position: { x: 0, y: 0 }
 *       }
 *    ],
 *    redUsers: [
 *      user1: {
 *         id: 'socketId',
 *        position: { x: 0, y: 0 }
 *     }
 *  }
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
                rooms[roomId] = { maze: [], redUsers: [], blueUsers: []};
                socket.join(roomId);
                socket.emit('roomCreated', { roomId });
                console.log(`Room created with ID: ${roomId}`);
                ExistingRoom = false;
            }
        }
    });

    // expected data = roomId
    socket.on('joinRoom', (roomId) => {
        // Check if the room exists and has less than 4 users
        if (rooms[roomId] && rooms[roomId].redUsers.length + rooms[roomId].blueUsers.length < 4) {
            socket.join(roomId);
            // Assign user to red or blue team
            if (rooms[roomId].redUsers.length <= rooms[roomId].blueUsers.length) {
                rooms[roomId].redUsers.push({ id: socket.id, position: { x: 0, y: 0 } });
                socket.emit('roomJoined', { roomId, team: 'red'});
                console.log(`User joined room with ID: ${roomId} as red`);
            } else {
                rooms[roomId].blueUsers.push({ id: socket.id, position: { x: 0, y: 0 } });
                socket.emit('roomJoined', { roomId, team: 'blue'});
                console.log(`User joined room with ID: ${roomId} as blue`);
            }

            // Notfiy room of players in the room
            io.to(roomId).emit('playersInRoom', { redUsers: rooms[roomId].redUsers, blueUsers: rooms[roomId].blueUsers });

            // Notify spectators of players in the room
            if (viewers[roomId]) {
                viewers[roomId].forEach(viewer => {
                    socket.to(viewer).emit('playersInRoom', { redUsers: rooms[roomId].redUsers, blueUsers: rooms[roomId].blueUsers });
                });
            }

            // Notify room if the game can start
            if (rooms[roomId].redUsers.length >= 1 && rooms[roomId].blueUsers.length >= 1) {
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
            socket.emit('playersInRoom', { redUsers: rooms[roomId].redUsers, blueUsers: rooms[roomId].blueUsers });
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
        rooms[roomId].redUsers.forEach(user => {
            user.position = { x: 1, y: 1 };
        });

        // initialize positions of players on the maze
        rooms[roomId].blueUsers.forEach(user => {
            user.position = { x: rooms[roomId].maze.length - 2, y: rooms[roomId].maze.length - 2 };
        });

        // emit gameStarted event and send maze and player positions
        io.to(roomId).emit('gameStarted', { maze: [], redUsers: rooms[roomId].redUsers, blueUsers: rooms[roomId].blueUsers });

        // emit gameStarted event to viewers
        if (viewers[roomId]) {
            viewers[roomId].forEach(viewer => {
                socket.to(viewer).emit('gameStarted', { maze: [], redUsers: rooms[roomId].redUsers, blueUsers: rooms[roomId].blueUsers });
            });
        }
    });

    // expected data = { roomId, position: { x, y } }
    socket.on('updatePosition', (data) => {
        // Find the user in the room and update their position
        for (const roomId in rooms) {
            const redUser = rooms[roomId].redUsers.find(user => user.id === socket.id);
            const blueUser = rooms[roomId].blueUsers.find(user => user.id === socket.id);
            if (redUser) {
                redUser.position = data.position;
                break;
            } else if (blueUser) {
                blueUser.position = data.position;
                break;
            }
        }

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
