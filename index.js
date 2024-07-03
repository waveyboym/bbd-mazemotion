const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname + '/public')));

app.get('/', (_, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/room/:id', (_, res) => {
    res.sendFile(__dirname + '/public/room.html');
});

app.get('/gyro', (_, res) => {
    res.sendFile(__dirname + '/public/gyro.html');
});

app.get('/viewer/:id', (_, res) => {
    res.sendFile(__dirname + '/public/viewer.html');
});

const viewers = {};

const rooms = {};

io.on("connection", (socket) => {
    socket.on("message", (message) => {
        console.log(`Message: ${message}`);
        socket.broadcast.emit("message", message);
    });

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

    socket.on('joinRoom', (roomId) => {
        if (!roomId) {
            socket.emit('roomNotFound');
            console.log('Room not found');
            return;
        }

        if (rooms[roomId] && rooms[roomId].Users.length < 4) {
            socket.join(roomId);
            rooms[roomId].Users.push({ id: socket.id, color: getRandomColor(), position: { x: 0, y: 0 } });
            socket.emit('roomJoined', { roomId });
            console.log(`User joined room with ID: ${roomId}`);

            io.to(roomId).emit('playersInRoom', { Users: rooms[roomId].Users, id: socket.id });
            
            if (viewers[roomId]) {
                viewers[roomId].forEach(viewer => {
                    socket.to(viewer).emit('playersInRoom', { Users: rooms[roomId].Users});
                });
            }

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

    socket.on('joinRoomAsViewer', (roomId) => {
        if (!roomId) {
            socket.emit('roomNotFound');
            console.log('Room not found');
            return;
        }
        
        if (rooms[roomId]) {
            socket.join(roomId);
            if (!viewers[roomId]) {
                viewers[roomId] = [];
            }
            viewers[roomId].push(socket.id);
            console.log(`Viewer joined room with ID: ${roomId}`);
            socket.emit('roomJoined', { roomId: roomId, team: 'spectator'});
            socket.emit('playersInRoom', { Users: rooms[roomId].Users });
        }
        else {
            socket.emit('roomNotFound');
            console.log(`Room not found: ${roomId}`);
        }
    });

    socket.on('startGame', (roomId) => {
        // create maze
        rooms[roomId].maze = generateMaze(21, 21);

        // initialize positions of players on the maze
        rooms[roomId].Users.forEach(user => {
            user.position = getRandomSpot(rooms[roomId].maze);
        });

        // emit gameStarted event and send maze and player positions
        io.to(roomId).emit('gameStarted', { maze: rooms[roomId].maze, Users: rooms[roomId].Users});

        // emit gameStarted event to viewers
        if (viewers[roomId]) {
            viewers[roomId].forEach(viewer => {
                socket.to(viewer).emit('gameStarted', { maze: rooms[roomId].maze, Users: rooms[roomId].Users});
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
        socket.to(data.roomId).emit('updatePosition', {Users: rooms[roomId].Users});
        // Broadcast the updated positions to all viewers in the room
        if (viewers[data.roomId]) {
            viewers[data.roomId].forEach(viewer => {
                socket.to(viewer).emit('updatePosition', {Users: rooms[roomId].Users});
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











// get random css color like blue, orange etc as string
function getRandomColor() {
    const colors = ['blue', 'orange', 'green', 'red', 'purple', 'yellow', 'pink', 'brown', 'cyan', 'magenta', 'lime', 'teal', 'indigo', 'violet', 'gray', 'black', 'white'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// pick random x,y spot in array that is available (0)
function getRandomSpot(maze) {
    let x = Math.floor(Math.random() * maze[0].length);
    let y = Math.floor(Math.random() * maze.length);
    while (maze[y][x] !== 0) {
        x = Math.floor(Math.random() * maze[0].length);
        y = Math.floor(Math.random() * maze.length);
    }
    return { x, y };
}

// maze generation

class DisjointSet {
    constructor(size) {
        this.parent = Array.from({ length: size }, (_, i) => i);
        this.rank = Array(size).fill(0);
    }

    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX !== rootY) {
            if (this.rank[rootX] > this.rank[rootY]) {
                this.parent[rootY] = rootX;
            } else if (this.rank[rootX] < this.rank[rootY]) {
                this.parent[rootX] = rootY;
            } else {
                this.parent[rootY] = rootX;
                this.rank[rootX]++;
            }
        }
    }
}

function generateMaze(width, height) {
    // Initialize the maze with walls
    let maze = Array.from({ length: height }, () => Array(width).fill(1));

    // Define the cells and edges
    let cells = [];
    let edges = [];

    // Populate the cells and edges
    for (let y = 1; y < height - 1; y += 2) {
        for (let x = 1; x < width - 1; x += 2) {
            cells.push([x, y]);
            if (x + 2 < width - 1) edges.push([[x, y], [x + 2, y]]);
            if (y + 2 < height - 1) edges.push([[x, y], [x, y + 2]]);
        }
    }

    // Shuffle the edges
    for (let i = edges.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [edges[i], edges[j]] = [edges[j], edges[i]];
    }

    // Initialize the disjoint set
    let ds = new DisjointSet(cells.length);

    // Create a map from cell coordinates to index
    let cellIndexMap = new Map();
    cells.forEach(([x, y], i) => {
        cellIndexMap.set(`${x},${y}`, i);
    });

    // Process each edge
    for (let [[x1, y1], [x2, y2]] of edges) {
        let index1 = cellIndexMap.get(`${x1},${y1}`);
        let index2 = cellIndexMap.get(`${x2},${y2}`);

        if (ds.find(index1) !== ds.find(index2)) {
            ds.union(index1, index2);
            maze[y1][x1] = 0;
            maze[y2][x2] = 0;
            maze[(y1 + y2) / 2][(x1 + x2) / 2] = 0;
        }
    }

    // Add borders
    for (let i = 0; i < width; i++) {
        maze[0][i] = maze[height - 1][i] = 1;
    }
    for (let i = 0; i < height; i++) {
        maze[i][0] = maze[i][width - 1] = 1;
    }

    return maze;
}