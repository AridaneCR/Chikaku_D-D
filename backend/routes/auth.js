const express = require("express");
const router = express.Router();
const Player = require("../models/player");
const MasterAuth = require("../models/masterAuth");
const {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticateAny,
  authenticateMaster,
} = require("../utils/auth");

const MASTER_DEFAULT_PASSWORD = process.env.MASTER_PASSWORD || "dragon";

function buildDefaultPlayerPassword(name = "") {
  return name.replace(/\s+/g, "");
}

function matchesDefaultPassword(inputPassword = "", playerName = "") {
  const defaultPassword = buildDefaultPlayerPassword(playerName);
  const input = String(inputPassword || "").trim();

  if (!defaultPassword) return false;

  return (
    input === defaultPassword ||
    input.toLowerCase() === defaultPassword.toLowerCase()
  );
}

async function getOrCreateMasterAuth() {
  let masterAuth = await MasterAuth.findOne({ key: "master" }).select(
    "+passwordHash +passwordSalt mustChangePassword",
  );

  if (!masterAuth) {
    const { hash, salt } = hashPassword(MASTER_DEFAULT_PASSWORD);
    masterAuth = await MasterAuth.create({
      key: "master",
      passwordHash: hash,
      passwordSalt: salt,
      mustChangePassword: true,
    });
  }

  return masterAuth;
}

router.post("/master/login", async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const masterAuth = await getOrCreateMasterAuth();
  const validSavedPassword = verifyPassword(
    password,
    masterAuth.passwordHash,
    masterAuth.passwordSalt,
  );
  const validDefaultPassword = password === MASTER_DEFAULT_PASSWORD;

  if (!validSavedPassword && !validDefaultPassword) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  if (validDefaultPassword && !validSavedPassword) {
    const { hash, salt } = hashPassword(MASTER_DEFAULT_PASSWORD);
    masterAuth.passwordHash = hash;
    masterAuth.passwordSalt = salt;
    masterAuth.mustChangePassword = true;
    await masterAuth.save();
  }

  const token = generateToken({ role: "master" });
  res.json({
    ok: true,
    token,
    role: "master",
    mustChangePassword: !!masterAuth.mustChangePassword,
  });
});

router.post("/master/change-password", authenticateMaster, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Faltan datos para cambiar contraseña" });
  }

  if (newPassword.length < 4) {
    return res
      .status(400)
      .json({ error: "La nueva contraseña debe tener al menos 4 caracteres" });
  }

  const masterAuth = await getOrCreateMasterAuth();
  const valid = verifyPassword(
    currentPassword,
    masterAuth.passwordHash,
    masterAuth.passwordSalt,
  );

  if (!valid) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const { hash, salt } = hashPassword(newPassword);
  masterAuth.passwordHash = hash;
  masterAuth.passwordSalt = salt;
  masterAuth.mustChangePassword = false;
  await masterAuth.save();

  res.json({ ok: true });
});

router.get("/players", async (req, res) => {
  try {
    const players = await Player.find({}, { name: 1 }).sort({ name: 1 }).lean();
    res.json(players.map((p) => ({ _id: p._id, name: p.name })));
  } catch (error) {
    console.error("PLAYERS LOGIN LIST ERROR:", error);
    res.status(500).json({ error: "No se pudieron cargar los personajes" });
  }
});

router.post("/player/login", async (req, res) => {
  const { playerId, password } = req.body;

  if (!playerId || !password) {
    return res.status(400).json({ error: "Faltan datos de login" });
  }

  const player = await Player.findById(playerId).select(
    "name passwordHash passwordSalt mustChangePassword",
  );

  if (!player) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const validSavedPassword =
    player.passwordHash && player.passwordSalt
      ? verifyPassword(password, player.passwordHash, player.passwordSalt)
      : false;

  const validDefaultPassword = matchesDefaultPassword(password, player.name);

  if (!validSavedPassword && !validDefaultPassword) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  if (validDefaultPassword) {
    const defaultPassword = buildDefaultPlayerPassword(player.name);
    const { hash, salt } = hashPassword(defaultPassword);
    player.passwordHash = hash;
    player.passwordSalt = salt;
    player.mustChangePassword = true;
    await player.save();
  }

  const token = generateToken({ role: "player", playerId: String(player._id) });

  res.json({
    ok: true,
    token,
    role: "player",
    playerId: String(player._id),
    name: player.name,
    mustChangePassword: player.mustChangePassword !== false,
  });
});

router.post("/player/change-password", authenticateAny, async (req, res) => {
  if (req.auth.role !== "player") {
    return res.status(403).json({ error: "Solo disponible para jugadores" });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Faltan datos para cambiar contraseña" });
  }

  if (newPassword.length < 4) {
    return res
      .status(400)
      .json({ error: "La nueva contraseña debe tener al menos 4 caracteres" });
  }

  const player = await Player.findById(req.auth.playerId).select(
    "name passwordHash passwordSalt mustChangePassword",
  );

  if (!player || !player.passwordHash || !player.passwordSalt) {
    return res.status(404).json({ error: "Jugador no encontrado" });
  }

  const valid = verifyPassword(
    currentPassword,
    player.passwordHash,
    player.passwordSalt,
  );
  if (!valid) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const { hash, salt } = hashPassword(newPassword);
  player.passwordHash = hash;
  player.passwordSalt = salt;
  player.mustChangePassword = false;
  await player.save();

  res.json({ ok: true });
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
