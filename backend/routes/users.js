const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Player = require("../models/player");
const Purchase = require("../models/Purchase");
const { hashPassword, verifyPassword, createSessionToken, requireUser, publicUser } = require("../utils/auth");

const router = express.Router();

function normalizeMasterUser(user) {
  return {
    ...publicUser(user),
    player: user.player ? { _id: user.player._id, name: user.player.name, chikacoins: user.player.chikacoins } : null,
  };
}

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !email || !password) return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
    if (password.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });

    if (await User.findOne({ email })) return res.status(409).json({ error: "Ese email ya está registrado" });

    const { hash, salt } = hashPassword(password);
    const user = await User.create({ name, email, passwordHash: hash, passwordSalt: salt, sessionToken: createSessionToken() });
    res.status(201).json({ ok: true, token: user.sessionToken, user: publicUser(user) });
  } catch (error) {
    console.error("REGISTER USER ERROR:", error);
    res.status(500).json({ error: "No se pudo registrar el usuario" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+passwordHash +passwordSalt +sessionToken");
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) return res.status(401).json({ error: "Email o contraseña incorrectos" });

    user.sessionToken = createSessionToken();
    await user.save();
    res.json({ ok: true, token: user.sessionToken, user: publicUser(user) });
  } catch (error) {
    console.error("LOGIN USER ERROR:", error);
    res.status(500).json({ error: "No se pudo iniciar sesión" });
  }
});

router.post("/logout", requireUser, async (req, res) => {
  req.user.sessionToken = null;
  await req.user.save();
  res.json({ ok: true });
});

router.get("/me", requireUser, async (req, res) => {
  const user = await User.findById(req.user._id).populate("player", "name life ca exp level gold chikacoins class subclass img items itemDescriptions updatedAt");
  res.json({ user: publicUser(user), player: user.player || null });
});

// ============================================================
// MASTER: gestión de usuarios
// ============================================================
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("name email player createdAt updatedAt").populate("player", "name chikacoins");
    res.json(users.map(normalizeMasterUser));
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    res.status(500).json({ error: "No se pudieron obtener los usuarios" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("+passwordHash +passwordSalt +sessionToken");
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (req.body.name !== undefined) user.name = String(req.body.name).trim();
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (await User.findOne({ email, _id: { $ne: user._id } })) return res.status(409).json({ error: "Ese email ya está registrado" });
      user.email = email;
    }

    if (req.body.password) {
      if (String(req.body.password).length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      const { hash, salt } = hashPassword(String(req.body.password));
      user.passwordHash = hash;
      user.passwordSalt = salt;
      user.sessionToken = null;
    }

    await user.save();
    const result = await User.findById(user._id).select("name email player createdAt updatedAt").populate("player", "name chikacoins");
    res.json({ ok: true, user: normalizeMasterUser(result) });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    res.status(500).json({ error: "No se pudo actualizar el usuario" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (user.player) await Player.updateOne({ _id: user.player }, { $set: { user: null } });
    await Purchase.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    res.json({ ok: true });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    res.status(500).json({ error: "No se pudo eliminar el usuario" });
  }
});

// El Master asigna o desasigna exactamente un personaje por usuario.
router.patch("/:id/player", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const user = await User.findById(req.params.id).session(session);
      if (!user) {
        const error = new Error("Usuario no encontrado");
        error.status = 404;
        throw error;
      }

      const previousPlayerId = user.player || null;
      const playerId = req.body.playerId || null;

      if (playerId) {
        const player = await Player.findById(playerId).session(session);
        if (!player) {
          const error = new Error("Personaje no encontrado");
          error.status = 404;
          throw error;
        }
        const owner = await User.findOne({ player: player._id, _id: { $ne: user._id } }).session(session);
        if (owner) {
          const error = new Error("Ese personaje ya está asignado a otro usuario");
          error.status = 409;
          throw error;
        }
      }

      if (previousPlayerId && String(previousPlayerId) !== String(playerId)) {
        await Player.updateOne({ _id: previousPlayerId }, { $set: { user: null } }, { session });
      }
      if (playerId) {
        await Player.updateOne({ _id: playerId }, { $set: { user: user._id } }, { session });
      }

      user.player = playerId;
      await user.save({ session });
      result = user;
    });

    req.app.get("notifyPlayersUpdate")?.();
    const populated = await User.findById(result._id).select("name email player createdAt updatedAt").populate("player", "name chikacoins");
    res.json({ ok: true, user: normalizeMasterUser(populated) });
  } catch (error) {
    console.error("ASSIGN USER PLAYER ERROR:", error);
    res.status(error.status || 500).json({ error: error.message || "No se pudo asignar el personaje" });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
