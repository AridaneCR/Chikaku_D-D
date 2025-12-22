// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const playersRouter = require("./routes/players");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI no definido en .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => {
    console.error("❌ Error al conectar MongoDB:", err);
    process.exit(1);
  });

// API routes
app.use("/api/players", playersRouter);

// (Opcional) servir carpeta pública si quieres que el front esté en el mismo servicio
// app.use(express.static(path.join(__dirname, "../frontend")));

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));

// keepalive
setInterval(() => {
  fetch("https://chikaku-d-d-backend-pbe.onrender.com")
}, 10 * 60 * 1000); // cada 10 min


// =============================================================
// SSE CLIENTS
// =============================================================

let sseClients = [];

// Endpoint SSE
app.get("/api/players/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.flushHeaders();

  const clientId = Date.now();
  const client = { id: clientId, res };

  sseClients.push(client);

  req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Función para avisar cambios
function notifyPlayersUpdate() {
  sseClients.forEach(client => {
    client.res.write(`event: playersUpdated\ndata: update\n\n`);
  });
}
