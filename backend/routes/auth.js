const express = require("express");
const router = express.Router();
const Player = require("../models/player");
const {
  verifyPassword,
  generateToken,
  authenticateAny,
} = require("../utils/auth");

const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "dragon";

router.post("/master/login", (req, res) => {
  const { password } = req.body;

  if (!password || password !== MASTER_PASSWORD) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = generateToken({ role: "master" });
  res.json({ ok: true, token, role: "master" });
});

router.get("/players", async (req, res) => {
  const players = await Player.find({}, { name: 1 }).sort({ name: 1 }).lean();
  res.json(players.map((p) => ({ _id: p._id, name: p.name })));
});

router.post("/player/login", async (req, res) => {
  const { playerId, password } = req.body;

  if (!playerId || !password) {
    return res.status(400).json({ error: "Faltan datos de login" });
  }

  const player = await Player.findById(playerId)
    .select("name passwordHash passwordSalt")
    .lean();

  if (!player || !player.passwordHash || !player.passwordSalt) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const valid = verifyPassword(password, player.passwordHash, player.passwordSalt);
  if (!valid) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = generateToken({ role: "player", playerId: String(player._id) });

  res.json({
    ok: true,
    token,
    role: "player",
    playerId: String(player._id),
    name: player.name,
  });
});

router.get("/me", authenticateAny, async (req, res) => {
  if (req.auth.role !== "player") {
    return res.status(400).json({ error: "Solo disponible para jugadores" });
  }

  const player = await Player.findById(req.auth.playerId).lean();
  if (!player) {
    return res.status(404).json({ error: "Jugador no encontrado" });
  }

  res.json({ ok: true, playerId: String(player._id), name: player.name });
});

module.exports = router;
