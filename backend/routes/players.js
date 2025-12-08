const express = require("express");
const router = express.Router();
const multer = require("multer");
const Player = require("../models/player");

const upload = multer({ storage: multer.memoryStorage() });

function toBase64(buffer) {
  return buffer ? buffer.toString("base64") : null;
}

/* ============================================================
   GET ALL PLAYERS
============================================================ */
router.get("/", async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: -1 });
    res.json(players);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error obteniendo jugadores." });
  }
});

/* ============================================================
   GET BY ID (DEBE IR ANTES QUE /:campaign)
============================================================ */
router.get("/id/:id", async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
    res.json(player);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error obteniendo jugador." });
  }
});

/* ============================================================
   GET BY CAMPAIGN (ESTA RUTA SIEMPRE VA LA ÚLTIMA)
============================================================ */
router.get("/:campaign", async (req, res) => {
  try {
    const players = await Player.find({ campaign: req.params.campaign });
    res.json(players);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error obteniendo campaña." });
  }
});

/* ============================================================
   CREATE PLAYER
============================================================ */
router.post(
  "/",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 6 }
  ]),
  async (req, res) => {
    try {
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
        skill1: req.body.skill1 || "",
        skill2: req.body.skill2 || "",
        milestones: req.body.milestones || "",
        attributes: req.body.attributes || "",
        exp: Number(req.body.exp) || 0,
        level: Number(req.body.level) || 1,
        img,
        items
      });

      res.json(await player.save());
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Error creando jugador" });
    }
  }
);

/* ============================================================
   UPDATE PLAYER
============================================================ */
router.put(
  "/:id",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 6 }
  ]),
  async (req, res) => {
    try {
      const player = await Player.findById(req.params.id);
      if (!player) return res.status(404).json({ error: "Jugador no encontrado" });

      player.name = req.body.name ?? player.name;
      player.life = req.body.life !== undefined ? Number(req.body.life) : player.life;
      player.skill1 = req.body.skill1 ?? player.skill1;
      player.skill2 = req.body.skill2 ?? player.skill2;
      player.milestones = req.body.milestones ?? player.milestones;
      player.attributes = req.body.attributes ?? player.attributes;
      player.exp = req.body.exp !== undefined ? Number(req.body.exp) : player.exp;
      player.level = req.body.level !== undefined ? Number(req.body.level) : player.level;

      if (req.files?.charImg?.[0]) {
        player.img = toBase64(req.files.charImg[0].buffer);
      }

      let keepItems = [];
      if (req.body.keepItems) {
        try {
          keepItems = JSON.parse(req.body.keepItems).filter(i => i && i !== "");
        } catch {
          keepItems = [];
        }
      }

      const newItems = req.files?.items
        ? req.files.items.map(f => toBase64(f.buffer))
        : [];

      player.items = [...keepItems, ...newItems].slice(0, 6);

      res.json(await player.save());
    } catch (e) {
      console.error("ERROR UPDATE:", e);
      res.status(500).json({ error: "Error actualizando jugador" });
    }
  }
);

/* ============================================================
   DELETE PLAYER
============================================================ */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Player.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Jugador no encontrado" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error eliminando jugador" });
  }
});

module.exports = router;
