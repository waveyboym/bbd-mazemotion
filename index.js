const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.get("/", (_req, res) => { 
    res.sendFile(__dirname + '/index.html');
});

io.on("connection", (socket) => {
    console.log("A user connected");

    // Broadcast that the user has connected
    io.emit("newUser", "A user has connected");

    socket.on("message", (message) => {
        console.log(`Message: ${message}`);
        // Broadcast the message to all connected clients except the one that sent the message
        socket.broadcast.emit("message", message);
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
        // Broadcast that the user has disconnected
        io.emit("removeUser", "A user has disconnected");
    });
});

// Use a port that Vercel can dynamically assign
const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Server listening on port http://localhost:${port}`);
});

module.exports = app;
