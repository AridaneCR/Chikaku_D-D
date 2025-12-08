// backend/routes/players.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const Player = require("../models/Player");

// Usamos memoryStorage y convertimos buffers a base64 para guardar en Mongo
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper: buffer -> base64 string (sin data: prefix)
 */
function toBase64(fileBuffer) {
  if (!fileBuffer) return null;
  return fileBuffer.toString("base64");
}

/**
 * GET /api/players
 * Devuelve todos los jugadores
 */
router.get("/", async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo jugadores." });
  }
});

/**
 * GET /api/players/:campaign
 * Devuelve jugadores de una campaña específica (opcional)
 */
router.get("/:campaign", async (req, res) => {
  try {
    const { campaign } = req.params;
    const players = await Player.find({ campaign }).sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo jugadores por campaña." });
  }
});

/**
 * GET /api/players/id/:id
 * Obtener jugador por id
 */
router.get("/id/:id", async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
    res.json(player);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo jugador." });
  }
});

/**
 * POST /api/players
 * Crear jugador con imágenes.
 * Campos form-data esperados:
 *  - name, life, skill1, skill2, milestones, attributes, exp, level, campaign (opcional)
 *  - charImg (file, max 1)
 *  - items (file[], max 6)
 */
router.post(
  "/",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 6 },
  ]),
  async (req, res) => {
    try {
      const body = req.body;

      // images -> base64
      const imgBase64 = req.files?.charImg?.[0]
        ? toBase64(req.files.charImg[0].buffer)
        : null;

      const itemsBase64 = req.files?.items
        ? req.files.items.map((f) => toBase64(f.buffer))
        : [];

      const newPlayer = new Player({
        campaign: body.campaign || "default",
        name: body.name,
        life: Number(body.life) || 10,
        skill1: body.skill1 || "",
        skill2: body.skill2 || "",
        milestones: body.milestones || "",
        attributes: body.attributes || "",
        exp: Number(body.exp) || 0,
        level: Number(body.level) || 1,
        img: imgBase64,
        items: itemsBase64,
      });

      await newPlayer.save();
      res.json(newPlayer);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Error creando jugador", details: err.message });
    }
  }
);

/**
 * PUT /api/players/:id
 * Editar jugador. Maneja:
 *  - archivos nuevos en charImg y items
 *  - body.keepItems (JSON array de base64 para mantener items previos)
 *
 * Strategy:
 *  - Si se envía charImg nuevo -> actualizar img
 *  - Para items: se respetan keepItems + se añaden nuevos archivos recibidos (en items)
 */
router.put(
  "/:id",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 6 },
  ]),
  async (req, res) => {
    try {
      const id = req.params.id;
      const body = req.body;

      const player = await Player.findById(id);
      if (!player) return res.status(404).json({ error: "Jugador no encontrado" });

      // Actualizar campos simples
      player.name = body.name ?? player.name;
      player.life = body.life !== undefined ? Number(body.life) : player.life;
      player.skill1 = body.skill1 ?? player.skill1;
      player.skill2 = body.skill2 ?? player.skill2;
      player.milestones = body.milestones ?? player.milestones;
      player.attributes = body.attributes ?? player.attributes;
      player.exp = body.exp !== undefined ? Number(body.exp) : player.exp;
      player.level = body.level !== undefined ? Number(body.level) : player.level;

      // Imagen principal (si viene archivo nuevo)
      if (req.files?.charImg?.[0]) {
        player.img = toBase64(req.files.charImg[0].buffer);
      }

      // Items: body.keepItems (JSON) contiene items ya existentes que se quieren conservar
      let keepItems = [];
      if (body.keepItems) {
        try {
          keepItems = JSON.parse(body.keepItems);
          if (!Array.isArray(keepItems)) keepItems = [];
        } catch (e) {
          keepItems = [];
        }
      }

      // Archivos nuevos -> añadir
      let newItems = [];
      if (req.files?.items) {
        newItems = req.files.items.map((f) => toBase64(f.buffer));
      }

      // Reemplazar items por keepItems + newItems (hasta 6)
      const merged = [...(keepItems || []), ...newItems].slice(0, 6);
      player.items = merged;

      const updated = await player.save();
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Error actualizando jugador", details: err.message });
    }
  }
);

/**
 * DELETE /api/players/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Player.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Jugador no encontrado" });
    res.json({ ok: true, deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error eliminando jugador" });
  }
});

module.exports = router;
