const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const Player = require("../models/player");

// ============================================================
// MULTER
// ============================================================

const upload = multer({ storage: multer.memoryStorage() });

function toBase64(buffer) {
  return buffer ? buffer.toString("base64") : null;
}

// ============================================================
// CACHE EN MEMORIA (🔥 CLAVE DEL RENDIMIENTO)
// ============================================================

let playersCache = {
  data: null,
  etag: null,
  timestamp: 0,
};

const CACHE_TTL = 10_000; // 10 segundos

function buildETag(players) {
  const signature = players
    .map(p => `${p._id}:${p.updatedAt?.getTime() || 0}`)
    .join("|");

  return crypto.createHash("sha1").update(signature).digest("hex");
}

function invalidateCache() {
  playersCache.data = null;
  playersCache.etag = null;
  playersCache.timestamp = 0;
}

// ============================================================
// GET ALL PLAYERS (CACHE + ETAG REAL)
// ============================================================

router.get("/", async (req, res) => {
  try {
    const now = Date.now();

    // 🔥 1. Cache válida
    if (
      playersCache.data &&
      now - playersCache.timestamp < CACHE_TTL
    ) {
      if (req.headers["if-none-match"] === playersCache.etag) {
        return res.status(304).end();
      }

      return res
        .set("ETag", playersCache.etag)
        .set("Cache-Control", "private, max-age=0, must-revalidate")
        .json(playersCache.data);
    }

    // 🐢 2. MongoDB
    const players = await Player.find()
      .sort({ createdAt: -1 })
      .lean();

    const etag = buildETag(players);

    // 🧠 3. Guardar cache
    playersCache = {
      data: players,
      etag,
      timestamp: now,
    };

    res
      .set("ETag", etag)
      .set("Cache-Control", "private, max-age=0, must-revalidate")
      .json(players);

  } catch (err) {
    console.error("GET PLAYERS ERROR:", err);
    res.status(500).json({ error: "Error obteniendo jugadores" });
  }
});

// ============================================================
// GET PLAYER BY ID
// ============================================================

router.get("/id/:id", async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player)
      return res.status(404).json({ error: "Jugador no encontrado" });

    res.json(player);
  } catch (err) {
    console.error("GET PLAYER ERROR:", err);
    res.status(500).json({ error: "Error obteniendo jugador" });
  }
});

// ============================================================
// CREATE PLAYER
// ============================================================

router.post(
  "/",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 6 },
  ]),
  async (req, res) => {
    try {
      const skills = req.body.skills ? JSON.parse(req.body.skills) : [];
      const itemDescriptions = req.body.itemDescriptions
        ? JSON.parse(req.body.itemDescriptions)
        : [];

      const img = req.files?.charImg?.[0]
        ? toBase64(req.files.charImg[0].buffer)
        : null;

      const items = req.files?.items
        ? req.files.items.map(f => toBase64(f.buffer))
        : [];

      const player = new Player({
        campaign: req.body.campaign || "default",
        name: req.body.name,
        life: Number(req.body.life) || 10,
        skills,
        milestones: req.body.milestones || "",
        attributes: req.body.attributes || "",
        exp: Number(req.body.exp) || 0,
        level: Number(req.body.level) || 1,
        img,
        items,
        itemDescriptions,
      });

      const saved = await player.save();

      invalidateCache(); // 🔥

      res.json(saved);
    } catch (err) {
      console.error("CREATE PLAYER ERROR:", err);
      res.status(400).json({ error: "Error creando jugador" });
    }
  }
);

// ============================================================
// UPDATE PLAYER
// ============================================================

router.put(
  "/:id",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 6 },
  ]),
  async (req, res) => {
    try {
      const player = await Player.findById(req.params.id);
      if (!player)
        return res.status(404).json({ error: "Jugador no encontrado" });

      player.name = req.body.name ?? player.name;
      player.life = req.body.life !== undefined
        ? Number(req.body.life)
        : player.life;

      player.milestones = req.body.milestones ?? player.milestones;
      player.attributes = req.body.attributes ?? player.attributes;
      player.exp = req.body.exp !== undefined
        ? Number(req.body.exp)
        : player.exp;

      player.level = req.body.level !== undefined
        ? Number(req.body.level)
        : player.level;

      if (req.body.skills) {
        player.skills = JSON.parse(req.body.skills);
      }

      if (req.body.itemDescriptions) {
        player.itemDescriptions = JSON.parse(req.body.itemDescriptions);
      }

      if (req.files?.charImg?.[0]) {
        player.img = toBase64(req.files.charImg[0].buffer);
      }

      if (req.files?.items?.length) {
        const newItems = req.files.items.map(f =>
          toBase64(f.buffer)
        );
        player.items = [...player.items, ...newItems].slice(0, 6);
      }

      const saved = await player.save();

      invalidateCache(); // 🔥

      res.json(saved);
    } catch (err) {
      console.error("UPDATE PLAYER ERROR:", err);
      res.status(500).json({ error: "Error actualizando jugador" });
    }
  }
);

// ============================================================
// DELETE PLAYER
// ============================================================

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Player.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ error: "Jugador no encontrado" });

    invalidateCache(); // 🔥

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE PLAYER ERROR:", err);
    res.status(500).json({ error: "Error eliminando jugador" });
  }
});

module.exports = router;
