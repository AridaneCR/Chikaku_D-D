const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const Player = require("../models/player");
const { uploadBuffer } = require("../utils/cloudinary");

const upload = multer({ storage: multer.memoryStorage() });

// ============================================================
// 🔥 CACHE EN MEMORIA
// ============================================================

let CACHE = {
  etag: null,
  data: null,
};

function invalidateCache() {
  CACHE = { etag: null, data: null };
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

    const signature = players
      .map(p => `${p._id}:${p.updatedAt?.getTime() || 0}`)
      .join("|");

    const etag = crypto
      .createHash("sha1")
      .update(signature)
      .digest("hex");

    CACHE = { etag, data: players };

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, must-revalidate");

    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    res.json(players);
  } catch (err) {
    console.error("GET PLAYERS ERROR:", err);
    res.status(500).json({ error: "Error obteniendo jugadores" });
  }
});

// ============================================================
// CREATE PLAYER (🔥 SUBE A CLOUDINARY)
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

      // 🔥 Imagen principal
      let img = null;
      if (req.files?.charImg?.[0]) {
        img = await uploadBuffer(
          req.files.charImg[0].buffer,
          "dnd/players"
        );
      }

      // 🔥 Objetos
      let items = [];
      if (req.files?.items?.length) {
        for (const file of req.files.items) {
          const url = await uploadBuffer(
            file.buffer,
            "dnd/items"
          );
          items.push(url);
        }
      }

      const player = new Player({
        campaign: req.body.campaign || "default",
        name: req.body.name,
        life: Number(req.body.life) || 10,
        milestones: req.body.milestones || "",
        attributes: req.body.attributes || "",
        exp: Number(req.body.exp) || 0,
        level: Number(req.body.level) || 1,
        skills,
        img,          // ✅ CDN
        items,        // ✅ CDN
        itemDescriptions,
      });

      const saved = await player.save();
      invalidateCache();

      res.json(saved);
    } catch (err) {
      console.error("CREATE PLAYER ERROR:", err);
      res.status(400).json({ error: "Error creando jugador" });
    }
  }
);

// ============================================================
// UPDATE PLAYER (CDN + NO BORRAR OBJETOS)
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
      player.life = req.body.life !== undefined ? Number(req.body.life) : player.life;
      player.milestones = req.body.milestones ?? player.milestones;
      player.attributes = req.body.attributes ?? player.attributes;
      player.exp = req.body.exp !== undefined ? Number(req.body.exp) : player.exp;
      player.level = req.body.level !== undefined ? Number(req.body.level) : player.level;

      if (req.body.skills) {
        player.skills = JSON.parse(req.body.skills);
      }

      if (req.body.itemDescriptions) {
        player.itemDescriptions = JSON.parse(req.body.itemDescriptions);
      }

      // 🔥 Nueva imagen principal
      if (req.files?.charImg?.[0]) {
        player.img = await uploadBuffer(
          req.files.charImg[0].buffer,
          "dnd/players"
        );
      }

      // 🔥 Añadir objetos nuevos
      if (req.files?.items?.length) {
        for (const file of req.files.items) {
          const url = await uploadBuffer(
            file.buffer,
            "dnd/items"
          );
          player.items.push(url);
        }
        player.items = player.items.slice(0, 6);
      }

      const saved = await player.save();
      invalidateCache();

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

    invalidateCache();
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE PLAYER ERROR:", err);
    res.status(500).json({ error: "Error eliminando jugador" });
  }
});

module.exports = router;
