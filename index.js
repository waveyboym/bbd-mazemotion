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
    socket.on("message", (msg) => {
        console.log("message: " + msg);
        io.emit("message", msg);
    });
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

// Use a port that Vercel can dynamically assign
const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

module.exports = app;
