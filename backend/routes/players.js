const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const Player = require("../models/player");
const { uploadImage, deleteImage } = require("../utils/cloudinary");

const upload = multer({ storage: multer.memoryStorage() });

// ============================================================
// 🧠 CACHE EN MEMORIA
// ============================================================
let CACHE = {
  etag: null,
  data: null,
};

function invalidateCache() {
  CACHE = { etag: null, data: null };
}

// ============================================================
// 🧩 NORMALIZACIÓN
// ============================================================
function normalizePlayer(p) {
  const resolveImg = (img) => {
    if (!img) return null;
    if (typeof img === "string") return img;
    if (typeof img === "object") return img.url || img.secure_url || null;
    return null;
  };

  return {
    _id: p._id,
    campaign: p.campaign || "default",
    name: p.name,
    life: Number(p.life) || 10,
    exp: Number(p.exp) || 0,
    level: Number(p.level) || 1,
    gold: Number(p.gold) || 0,

    class: p.class || "",
    subclass: p.subclass || "",

    milestones: p.milestones || "",
    attributes: p.attributes || "",
    skills: Array.isArray(p.skills) ? p.skills : [],

    img: resolveImg(p.img),

    items: Array.isArray(p.items)
      ? p.items.map(resolveImg).filter(Boolean)
      : [],

    itemDescriptions: Array.isArray(p.itemDescriptions)
      ? p.itemDescriptions
      : [],

    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ============================================================
// GET ALL PLAYERS
// ============================================================
router.get("/", async (req, res) => {
  try {
    if (req.headers["x-realtime"] === "1") invalidateCache();

    if (CACHE.etag && req.headers["if-none-match"] === CACHE.etag) {
      return res.status(304).end();
    }

    if (CACHE.data) {
      res.setHeader("ETag", CACHE.etag);
      res.setHeader("Cache-Control", "private, must-revalidate");
      return res.json(CACHE.data);
    }

    const players = await Player.find().sort({ createdAt: -1 }).lean();
    const normalized = players.map(normalizePlayer);

    const signature = normalized
      .map((p) => `${p._id}:${new Date(p.updatedAt).getTime()}`)
      .join("|");

    const etag = crypto.createHash("sha1").update(signature).digest("hex");

    CACHE = { etag, data: normalized };

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, must-revalidate");
    res.json(normalized);
  } catch (err) {
    console.error("GET PLAYERS ERROR:", err);
    res.status(500).json({ error: "Error obteniendo jugadores" });
  }
});

// ============================================================
// CREATE PLAYER (OBJETOS DINÁMICOS)
// ============================================================
router.post(
  "/",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 100 },
  ]),
  async (req, res) => {
    try {
      const notify = req.app.get("notifyPlayersUpdate");

      const skills = req.body.skills ? JSON.parse(req.body.skills) : [];
      const itemDescriptions = req.body.itemDescriptions
        ? JSON.parse(req.body.itemDescriptions)
        : [];

      // ---------- IMAGEN PRINCIPAL ----------
      let img = null;
      if (req.files?.charImg?.[0]) {
        img = await uploadImage(req.files.charImg[0].buffer, "players");
      }

      // ---------- OBJETOS CON ÍNDICES ----------
      let items = [];
      let finalDescriptions = [];

      const indices = req.body.itemsIndex
        ? Array.isArray(req.body.itemsIndex)
          ? req.body.itemsIndex.map(Number)
          : [Number(req.body.itemsIndex)]
        : [];

      if (req.files?.items?.length) {
        for (let i = 0; i < req.files.items.length; i++) {
          const index = indices[i] ?? i;
          const uploaded = await uploadImage(
            req.files.items[i].buffer,
            "items",
          );

          while (items.length <= index) items.push(null);
          items[index] = uploaded;
        }
      }

      finalDescriptions = items.map((_, i) => itemDescriptions[i] || "");

      const player = new Player({
        campaign: req.body.campaign || "default",
        name: req.body.name,
        life: Number(req.body.life) || 10,
        milestones: req.body.milestones || "",
        attributes: req.body.attributes || "",
        exp: Number(req.body.exp) || 0,
        level: Number(req.body.level) || 1,
        gold: Number(req.body.gold) || 0,
        class: req.body.class || "",
        subclass: req.body.subclass || "",
        skills,
        img,
        items,
        itemDescriptions: finalDescriptions,
      });

      const saved = await player.save();

      invalidateCache();
      notify?.();

      res.json(normalizePlayer(saved));
    } catch (err) {
      console.error("CREATE PLAYER ERROR:", err);
      res.status(500).json({ error: "Error creando jugador" });
    }
  },
);

// ============================================================
// UPDATE PLAYER (OBJETOS ILIMITADOS)
// ============================================================
router.put(
  "/:id",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 100 },
  ]),
  async (req, res) => {
    try {
      const notify = req.app.get("notifyPlayersUpdate");

      const player = await Player.findById(req.params.id);
      if (!player) {
        return res.status(404).json({ error: "Jugador no encontrado" });
      }

      // ---------- CAMPOS ----------
      player.name = req.body.name ?? player.name;
      player.life =
        req.body.life !== undefined ? Number(req.body.life) : player.life;
      player.exp =
        req.body.exp !== undefined ? Number(req.body.exp) : player.exp;
      player.level =
        req.body.level !== undefined ? Number(req.body.level) : player.level;
      player.class =
        req.body.class !== undefined ? req.body.class : player.class;
      player.subclass =
        req.body.subclass !== undefined ? req.body.subclass : player.subclass;

      if (req.body.skills) {
        player.skills = JSON.parse(req.body.skills);
      }

      // ---------- HITOS Y ATRIBUTOS ----------
      player.milestones =
        req.body.milestones !== undefined
          ? req.body.milestones
          : player.milestones;

      player.attributes =
        req.body.attributes !== undefined
          ? req.body.attributes
          : player.attributes;

      // ---------- BORRAR OBJETOS ----------
      const itemsToDelete = req.body.itemsToDelete
        ? JSON.parse(req.body.itemsToDelete)
        : [];

      if (itemsToDelete.length) {
        itemsToDelete
          .sort((a, b) => b - a)
          .forEach((i) => {
            if (player.items[i]) deleteImage(player.items[i]);
            player.items.splice(i, 1);
            player.itemDescriptions.splice(i, 1);
          });
        player.markModified("items");
      }

      // ---------- IMAGEN PRINCIPAL ----------
      if (req.files?.charImg?.[0]) {
        if (player.img) await deleteImage(player.img);
        player.img = await uploadImage(req.files.charImg[0].buffer, "players");
      }

      // ---------- SUBIR / REEMPLAZAR OBJETOS ----------
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

          const uploaded = await uploadImage(
            req.files.items[i].buffer,
            "items",
          );

          while (player.items.length <= index) player.items.push(null);
          player.items[index] = uploaded;
        }

        player.markModified("items");
      }

      // ---------- DESCRIPCIONES ----------
      if (req.body.itemDescriptions !== undefined) {
        const newDescriptions = JSON.parse(req.body.itemDescriptions);

        player.itemDescriptions = player.items.map(
          (_, i) => newDescriptions[i] || ""
        );

        player.markModified("itemDescriptions");
      }

      player.updatedAt = new Date();

      const saved = await player.save();

      invalidateCache();
      notify?.();

      res.json(normalizePlayer(saved));
    } catch (err) {
      console.error("UPDATE PLAYER ERROR:", err);
      res.status(500).json({ error: "Error actualizando jugador" });
    }
  },
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

// ============================================================
// 🪙 UPDATE GOLD
// ============================================================
router.patch("/:id/gold", async (req, res) => {
  try {
    const notify = req.app.get("notifyPlayersUpdate");
    const { amount, mode } = req.body;

    if (typeof amount !== "number") {
      return res.status(400).json({ error: "Cantidad inválida" });
    }

    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: "Jugador no encontrado" });
    }

    if (mode === "set") {
      player.gold = Math.max(0, amount);
    } else {
      player.gold = Math.max(0, (player.gold || 0) + amount);
    }

    player.updatedAt = new Date();
    const saved = await player.save();

    invalidateCache();
    notify?.();

    res.json({
      ok: true,
      gold: saved.gold,
      player: normalizePlayer(saved),
    });
  } catch (err) {
    console.error("UPDATE GOLD ERROR:", err);
    res.status(500).json({ error: "Error actualizando oro" });
  }
});

router.get("/campaign-info", async (req, res) => {

  const info = await Settings.findOne({ key: "campaignInfo" });

  res.json({
    info: info?.value || ""
  });

});

module.exports = router;
