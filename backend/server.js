// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const playersRouter = require("./routes/players");
const productsRouter = require("./routes/products");
const storeRouter = require("./routes/store");

const app = express();

// =============================================================
// MIDDLEWARES
// =============================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================================
// MONGODB
// =============================================================
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI no definido en .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => {
    console.error("❌ Error MongoDB:", err);
    process.exit(1);
  });

// =============================================================
// SSE CLIENTS
// =============================================================
let sseClients = [];

function notifyPlayersUpdate() {
  sseClients.forEach((client) => {
    try {
      client.res.write(`event: playersUpdated\ndata: update\n\n`);
    } catch {
      sseClients = sseClients.filter((c) => c !== client);
    }
  });
}

setInterval(() => {
  sseClients.forEach((client) => {
    client.res.write(`:\n\n`);
  });
}, 15000);

app.set("notifyPlayersUpdate", notifyPlayersUpdate);

// =============================================================
// SSE ENDPOINT
// =============================================================
app.get("/api/players/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.flushHeaders();

  const client = { res };
  sseClients.push(client);

  res.write(`event: connected\ndata: ok\n\n`);

  req.on("close", () => {
    sseClients = sseClients.filter((c) => c !== client);
  });
});

// =============================================================
// ROUTES
// =============================================================
app.use("/api/players", playersRouter);
app.use("/api/products", productsRouter);
app.use("/api/store", storeRouter);

// =============================================================
// HEALTH CHECK
// =============================================================
app.get("/health", (req, res) => res.json({ ok: true }));

// =============================================================
// START SERVER
// =============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`),
);

// =============================================================
// KEEPALIVE (RENDER)
// =============================================================
setInterval(() => {
  fetch("https://chikaku-d-d-1.onrender.com").catch(() => {});
}, 10 * 60 * 1000);

const campaignInfoRoutes = require("./routes/campaignInfo");
app.use("/api/campaign-info", campaignInfoRoutes);
