const mongoose = require("mongoose");

// ============================================================
// PLAYER SCHEMA (CDN READY + LEGACY SAFE)
// ============================================================

const PlayerSchema = new mongoose.Schema(
  {
    // -------------------------
    // META
    // -------------------------
    campaign: {
      type: String,
      default: "default",
      index: true,
    },

    name: {
      type: String,
      required: true,
      index: true,
    },

    // -------------------------
    // STATS
    // -------------------------
    life: {
      type: Number,
      default: 10,
    },

    exp: {
      type: Number,
      default: 0,
    },

    level: {
      type: Number,
      default: 1,
    },

    milestones: {
      type: String,
      default: "",
    },

    attributes: {
      type: String,
      default: "",
    },

    // -------------------------
    // SKILLS
    // -------------------------
    skills: {
      type: [String],
      default: [],
    },

    // -------------------------
    // 🔥 IMAGEN PRINCIPAL
    // -------------------------

    // ✅ NUEVO → URL Cloudinary
    img: {
      type: String,
      default: null,
    },

    // 🟡 LEGACY → base64 (migración)
    imgBase64: {
      type: String,
      default: null,
      select: false, // 🔒 no se envía salvo que se pida explícito
    },

    // -------------------------
    // 🔥 OBJETOS
    // -------------------------

    // ✅ NUEVO → URLs Cloudinary
    items: {
      type: [String],
      default: [],
    },

    // 🟡 LEGACY → base64
    itemsBase64: {
      type: [String],
      default: [],
      select: false,
    },

    itemDescriptions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // 🔥 necesario para cache + ETag
  }
);

module.exports = mongoose.model("Player", PlayerSchema);
