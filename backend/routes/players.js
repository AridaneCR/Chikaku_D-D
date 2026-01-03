const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const Player = require("../models/player");
const { uploadImage, deleteImage } = require("../utils/cloudinary");

const upload = multer({ storage: multer.memoryStorage() });

// ============================================================
// CACHE EN MEMORIA
// ============================================================
let CACHE = {
  etag: null,
  data: null,
};

function invalidateCache() {
  CACHE = { etag: null, data: null };
}

// ============================================================
// NORMALIZACIÓN (🔥 CLAVE ABSOLUTA)
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

    // 🔥 SIEMPRE STRING
    img:
      typeof p.img === "string"
        ? p.img
        : p.img?.url || null,

    // 🔥 SIEMPRE ARRAY DE STRINGS
    items: Array.isArray(p.items)
      ? p.items.map(i =>
          typeof i === "string" ? i : i.url
        )
      : [],

    itemDescriptions: Array.isArray(p.itemDescriptions)
      ? p.itemDescriptions
      : [],

    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ============================================================
// GET ALL PLAYERS (CON CACHE + ETag)
// ============================================================
router.get("/", async (req, res) => {
  try {
    if (req.headers["x-realtime"] === "1") invalidateCache();

    if (CACHE.etag && req.headers["if-none-match"] === CACHE.etag) {
      return res.status(304).end();
    }

    if (CACHE.data) {
      res.setHeader("ETag", CACHE.etag);
      return res.json(CACHE.data);
    }

    const players = await Player.find().sort({ createdAt: -1 });
    const normalized = players.map(normalizePlayer);

    const signature = normalized
      .map(p => `${p._id}:${p.updatedAt.getTime()}`)
      .join("|");

    const etag = crypto.createHash("sha1").update(signature).digest("hex");

    CACHE = { etag, data: normalized };
    res.setHeader("ETag", etag);
    res.json(normalized);
  } catch (err) {
    console.error("GET PLAYERS ERROR:", err);
    res.status(500).json({ error: "Error obteniendo jugadores" });
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
        campaign: req.body.campaign || "default",
        name: req.body.name,
        life: Number(req.body.life) || 10,
        milestones: req.body.milestones || "",
        attributes: req.body.attributes || "",
        exp: Number(req.body.exp) || 0,
        level: Number(req.body.level) || 1,
        skills,
        img,
        items,
        itemDescriptions: items.map((_, i) => itemDescriptions[i] || ""),
      });

      const saved = await player.save();

      invalidateCache();
      notify?.();

      res.json(normalizePlayer(saved));
    } catch (err) {
      console.error("CREATE PLAYER ERROR:", err);
      res.status(400).json({ error: "Error creando jugador" });
    }
  }
);

// ============================================================
// UPDATE PLAYER (FIX DEFINITIVO)
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
      if (!player) {
        return res.status(404).json({ error: "Jugador no encontrado" });
      }

      // ------------------------------
      // CAMPOS SIMPLES
      // ------------------------------
      player.name = req.body.name ?? player.name;
      player.life =
        req.body.life !== undefined ? Number(req.body.life) : player.life;
      player.milestones = req.body.milestones ?? player.milestones;
      player.attributes = req.body.attributes ?? player.attributes;
      player.exp =
        req.body.exp !== undefined ? Number(req.body.exp) : player.exp;
      player.level =
        req.body.level !== undefined ? Number(req.body.level) : player.level;

      if (req.body.skills) {
        player.skills = JSON.parse(req.body.skills);
      }

      // ------------------------------
      // BORRAR OBJETOS
      // ------------------------------
      const itemsToDelete = req.body.itemsToDelete
        ? JSON.parse(req.body.itemsToDelete)
        : [];

      if (itemsToDelete.length) {
        itemsToDelete
          .sort((a, b) => b - a)
          .forEach(i => {
            if (player.items[i]) deleteImage(player.items[i]);
            player.items.splice(i, 1);
            player.itemDescriptions.splice(i, 1);
          });

        player.markModified("items");
      }

      // ------------------------------
      // IMAGEN PRINCIPAL
      // ------------------------------
      if (req.files?.charImg?.[0]) {
        if (player.img) await deleteImage(player.img);

        player.img = await uploadImage(
          req.files.charImg[0].buffer,
          "players"
        );

        player.markModified("img");
      }

      // ------------------------------
      // REEMPLAZO DE ITEMS
      // ------------------------------
      if (req.files?.items?.length && req.body.itemsIndex !== undefined) {
        const indices = Array.isArray(req.body.itemsIndex)
          ? req.body.itemsIndex.map(Number)
          : [Number(req.body.itemsIndex)];

        for (let i = 0; i < req.files.items.length; i++) {
          const index = indices[i];
          if (Number.isNaN(index)) continue;

          if (player.items[index]) {
            await deleteImage(player.items[index]);
          }

          const img = await uploadImage(
            req.files.items[i].buffer,
            "items"
          );

          player.items[index] = img;
        }

        player.markModified("items");
      }

      // ------------------------------
      // DESCRIPCIONES
      // ------------------------------
      const newDescriptions = req.body.itemDescriptions
        ? JSON.parse(req.body.itemDescriptions)
        : [];

      player.itemDescriptions = player.items.map(
        (_, i) => newDescriptions[i] || ""
      );

      // ------------------------------
      // FINAL
      // ------------------------------
      player.items = player.items.slice(0, 6);
      player.itemDescriptions = player.itemDescriptions.slice(0, 6);
      player.updatedAt = new Date();

      const saved = await player.save();

      invalidateCache();
      notify?.();

      res.json(normalizePlayer(saved));
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
    const notify = req.app.get("notifyPlayersUpdate");

    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: "Jugador no encontrado" });
    }

    if (player.img) await deleteImage(player.img);
    if (player.items?.length) {
      await Promise.all(player.items.map(deleteImage));
    }

    await player.deleteOne();

    invalidateCache();
    notify?.();

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE PLAYER ERROR:", err);
    res.status(500).json({ error: "Error eliminando jugador" });
  }
});

module.exports = router;
