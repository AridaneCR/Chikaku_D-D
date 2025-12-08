const express = require("express");
const router = express.Router();
const Player = require("../models/Player");
const multer = require("multer");

// Multer en memoria (para guardar imágenes como Base64)
const upload = multer({ storage: multer.memoryStorage() });


// =====================================
// GET – Obtener jugadores por campaña
// =====================================
router.get("/:campaign", async (req, res) => {
  try {
    const players = await Player.find({ campaign: req.params.campaign });
    res.json(players);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


// =====================================
// POST – Crear jugador
// =====================================
router.post(
  "/",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 6 }
  ]),
  async (req, res) => {
    try {
      const {
        campaign,
        name,
        life,
        skill1,
        skill2,
        milestones,
        attributes,
        exp,
        level
      } = req.body;

      const mainImg = req.files["charImg"]
        ? req.files["charImg"][0].buffer.toString("base64")
        : null;

      const items = req.files["items"]
        ? req.files["items"].map((f) => f.buffer.toString("base64"))
        : [];

      const newPlayer = await Player.create({
        campaign,
        name,
        life,
        skill1,
        skill2,
        milestones,
        attributes,
        exp,
        level,
        img: mainImg,
        items
      });

      res.json({ ok: true, player: newPlayer });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  }
);


// =====================================
// PUT – Editar jugador
// =====================================
router.put(
  "/:id",
  upload.fields([
    { name: "charImg", maxCount: 1 },
    { name: "items", maxCount: 6 }
  ]),
  async (req, res) => {
    try {
      const id = req.params.id;

      const {
        name,
        life,
        skill1,
        skill2,
        milestones,
        attributes,
        exp,
        level,
        keepItems
      } = req.body;

      const previousItems = keepItems ? JSON.parse(keepItems) : [];

      const newItemImgs = req.files["items"]
        ? req.files["items"].map((f) => f.buffer.toString("base64"))
        : [];

      const finalItems = [...previousItems, ...newItemImgs];

      let update = {
        name,
        life,
        skill1,
        skill2,
        milestones,
        attributes,
        exp,
        level,
        items: finalItems
      };

      if (req.files["charImg"]) {
        update.img = req.files["charImg"][0].buffer.toString("base64");
      }

      const updated = await Player.findByIdAndUpdate(id, update, {
        new: true
      });

      res.json({ ok: true, player: updated });

    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  }
);


// =====================================
// DELETE – Eliminar jugador
// =====================================
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Player.findByIdAndDelete(req.params.id);
    res.json({ ok: true, deleted });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});


module.exports = router;
