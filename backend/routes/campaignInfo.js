const express = require("express");
const router = express.Router();
const CampaignInfo = require("../models/CampaignInfo");


// ============================================================
// GET CAMPAIGN INFO
// ============================================================

router.get("/", async (req, res) => {

  try {

    const doc = await CampaignInfo.findOne({ campaign: "default" });

    res.json({
      info: doc?.info || ""
    });

  } catch (err) {

    console.error("GET CAMPAIGN INFO ERROR:", err);

    res.status(500).json({
      error: "Error obteniendo información de campaña"
    });

  }

});


// ============================================================
// SAVE CAMPAIGN INFO
// ============================================================

router.post("/", async (req, res) => {

  try {

    const { info } = req.body;

    const doc = await CampaignInfo.findOneAndUpdate(
      { campaign: "default" },
      { info: info || "" },
      {
        upsert: true,
        new: true,
      }
    );

    res.json({
      ok: true,
      info: doc.info
    });

  } catch (err) {

    console.error("SAVE CAMPAIGN INFO ERROR:", err);

    res.status(500).json({
      error: "Error guardando información"
    });

  }

});

module.exports = router;