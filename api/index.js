const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Express on Vercel"));

app.listen(55555, () => console.log("Server ready on port 55555."));

module.exports = app;