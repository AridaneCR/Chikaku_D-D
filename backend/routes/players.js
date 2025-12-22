const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const Player = require("../models/player");

const { uploadImage, deleteImage } = require("../utils/cloudinary");

const upload = multer({ storage: multer.memoryStorage() });

// ============================================================
// 🔥 CACHE EN MEMORIA
// ============================================================
let CACHE = {
  etag: null,
  data: null,
  updatedAt: 0,
};

function invalidateCache() {
  CACHE = { etag: null, data: null, updatedAt: 0 };
}

// ============================================================
// 🧩 NORMALIZACIÓN (FRONTEND SAFE)
// ============================================================
function normalizePlayer(p) {
  return {
    _id: p._id,
    campaign: p.campaign || "default",
    name: p.name,
    life: Number(p.life) || 10,
    exp: Number(p.exp) || 0,
    level: Number(p.level) || 1,
    milestones: p.milestones || "",
    attributes: p.attributes || "",
    skills: Array.isArray(p.skills) ? p.skills : [],
    img: p.img || null,
    items: Array.isArray(p.items) ? p.items : [],
    itemDescriptions: Array.isArray(p.itemDescriptions)
      ? p.itemDescriptions
      : [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ============================================================
// GET ALL PLAYERS (CACHE + ETAG)
// ============================================================
router.get("/", async (req, res) => {
  try {
    if (CACHE.etag && req.headers["if-none-match"] === CACHE.etag) {
      return res.status(304).end();
    }

    if (CACHE.data) {
      res.setHeader("ETag", CACHE.etag);
      res.setHeader("Cache-Control", "private, must-revalidate");
      return res.json(CACHE.data);
    }

    const players = await Player.find()
      .sort({ createdAt: -1 })
      .lean();

    const normalized = players.map(normalizePlayer);

    const signature = normalized
      .map(p => `${p._id}:${p.updatedAt?.getTime() || 0}`)
      .join("|");

    const etag = crypto
      .createHash("sha1")
      .update(signature)
      .digest("hex");

    CACHE = { etag, data: normalized, updatedAt: Date.now() };

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, must-revalidate");

    res.json(normalized);
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
    const p = await Player.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: "Jugador no encontrado" });
    res.json(normalizePlayer(p));
  } catch (err) {
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
      const notify = req.app.get("notifyPlayersUpdate");

      const skills = req.body.skills ? JSON.parse(req.body.skills) : [];
      const itemDescriptions = req.body.itemDescriptions
        ? JSON.parse(req.body.itemDescriptions)
        : [];

      let img = null;
      if (req.files?.charImg?.[0]) {
        img = await uploadImage(req.files.charImg[0].buffer, "players");
      }

      let items = [];
      if (req.files?.items?.length) {
        items = await Promise.all(
          req.files.items.map(f => uploadImage(f.buffer, "items"))
        );
      }

      const player = new Player({
        name: req.body.name,
        life: Number(req.body.life) || 10,
        milestones: req.body.milestones || "",
        attributes: req.body.attributes || "",
        exp: Number(req.body.exp) || 0,
        level: Number(req.body.level) || 1,
        skills,
        img,
        items,
        itemDescriptions,
      });

      const saved = await player.save();

      invalidateCache();
      notify("create", { id: saved._id });

      res.json(normalizePlayer(saved.toObject()));
    } catch (err) {
      console.error(err);
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
      const notify = req.app.get("notifyPlayersUpdate");

      const player = await Player.findById(req.params.id);
      if (!player)
        return res.status(404).json({ error: "Jugador no encontrado" });

      Object.assign(player, {
        name: req.body.name ?? player.name,
        life: req.body.life ?? player.life,
        milestones: req.body.milestones ?? player.milestones,
        attributes: req.body.attributes ?? player.attributes,
        exp: req.body.exp ?? player.exp,
        level: req.body.level ?? player.level,
      });

      if (req.body.skills) {
        player.skills = JSON.parse(req.body.skills);
      }

      if (req.body.itemDescriptions) {
        player.itemDescriptions = JSON.parse(req.body.itemDescriptions);
      }

      if (req.files?.charImg?.[0]) {
        if (player.img) await deleteImage(player.img);
        player.img = await uploadImage(
          req.files.charImg[0].buffer,
          "players"
        );
      }

      if (req.files?.items?.length) {
        const newItems = await Promise.all(
          req.files.items.map(f => uploadImage(f.buffer, "items"))
        );
        player.items = [...player.items, ...newItems].slice(0, 6);
      }

      const saved = await player.save();

      invalidateCache();
      notify("update", { id: saved._id });

      res.json(normalizePlayer(saved.toObject()));
    } catch (err) {
      res.status(500).json({ error: "Error actualizando jugador" });
    }
  }
);

// ============================================================
// DELETE PLAYER
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    const notify = req.app.get("notifyPlayersUpdate");

    const player = await Player.findById(req.params.id);
    if (!player)
      return res.status(404).json({ error: "Jugador no encontrado" });

    if (player.img) await deleteImage(player.img);
    if (player.items?.length) {
      await Promise.all(player.items.map(deleteImage));
    }

    await player.deleteOne();

    invalidateCache();
    notify("delete", { id: player._id });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando jugador" });
  }
});

module.exports = router;
