const express = require("express");
const router = express.Router();
const multer = require("multer");
const Player = require("../models/player");

// ============================================================
// CONFIG MULTER (MEMORIA)
// ============================================================

const upload = multer({ storage: multer.memoryStorage() });

const toBase64 = (buffer) =>
  buffer ? buffer.toString("base64") : null;

// ============================================================
// GET ALL PLAYERS
// - Normaliza skills legacy
// ============================================================

router.get("/", async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: -1 });

    const normalized = players.map((p) => {
      const obj = p.toObject();

      // 🔥 Compatibilidad legacy (skill1 / skill2)
      if (!Array.isArray(obj.skills)) {
        obj.skills = [];
      }

      if (obj.skills.length === 0) {
        if (obj.skill1) obj.skills.push(obj.skill1);
        if (obj.skill2) obj.skills.push(obj.skill2);
      }

      // Seguridad extra
      if (!Array.isArray(obj.itemDescriptions)) {
        obj.itemDescriptions = [];
      }

      return obj;
    });

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
      const skills = req.body.skills
        ? JSON.parse(req.body.skills)
        : [];

      const itemDescriptions = req.body.itemDescriptions
        ? JSON.parse(req.body.itemDescriptions)
        : [];

      const img = req.files?.charImg?.[0]
        ? toBase64(req.files.charImg[0].buffer)
        : null;

      const items = req.files?.items
        ? req.files.items.map((f) => toBase64(f.buffer))
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
      res.json(saved);
    } catch (err) {
      console.error("CREATE PLAYER ERROR:", err);
      res.status(400).json({ error: "Error creando jugador" });
    }
  }
);

// ============================================================
// UPDATE PLAYER
// - No borra objetos existentes
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
      player.life =
        req.body.life !== undefined
          ? Number(req.body.life)
          : player.life;

      player.milestones = req.body.milestones ?? player.milestones;
      player.attributes = req.body.attributes ?? player.attributes;
      player.exp =
        req.body.exp !== undefined
          ? Number(req.body.exp)
          : player.exp;

      player.level =
        req.body.level !== undefined
          ? Number(req.body.level)
          : player.level;

      // ✅ Skills
      if (req.body.skills) {
        player.skills = JSON.parse(req.body.skills);
      }

      // ✅ Descripciones de objetos
      if (req.body.itemDescriptions) {
        player.itemDescriptions = JSON.parse(
          req.body.itemDescriptions
        );
      }

      // ✅ Imagen principal
      if (req.files?.charImg?.[0]) {
        player.img = toBase64(req.files.charImg[0].buffer);
      }

      // ✅ Añadir objetos nuevos sin borrar los antiguos
      if (req.files?.items?.length) {
        const newItems = req.files.items.map((f) =>
          toBase64(f.buffer)
        );
        player.items = [...player.items, ...newItems].slice(0, 6);
      }

      const saved = await player.save();
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

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE PLAYER ERROR:", err);
    res.status(500).json({ error: "Error eliminando jugador" });
  }
});

module.exports = router;
