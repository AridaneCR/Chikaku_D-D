const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema(
  {
    // ============================================================
    // BÁSICO
    // ============================================================

    campaign: {
      type: String,
      default: "default",
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    life: {
      type: Number,
      default: 10,
    },

    level: {
      type: Number,
      default: 1,
    },

    exp: {
      type: Number,
      default: 0,
    },

    milestones: {
      type: String,
      default: "",
    },

    attributes: {
      type: String,
      default: "",
    },

    // ============================================================
    // HABILIDADES
    // ============================================================

    skills: {
      type: [String],
      default: [],
    },

    // ============================================================
    // 🖼️ IMAGEN PRINCIPAL
    // ============================================================

    // 🔥 NUEVO (CDN)
    imgUrl: {
      type: String,
      default: null,
    },

    // 🧓 LEGACY (base64)
    imgBase64: {
      type: String,
      default: null,
      select: true, // lo seguimos enviando de momento
    },

    // ============================================================
    // 🎒 OBJETOS
    // ============================================================

    // 🔥 NUEVO (CDN)
    itemsUrls: {
      type: [String],
      default: [],
    },

    // 🧓 LEGACY (base64)
    itemsBase64: {
      type: [String],
      default: [],
      select: true,
    },

    itemDescriptions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt / updatedAt (🔥 clave para ETag)
  }
);

// ============================================================
// 🔥 ÍNDICES (OPTIMIZACIÓN)
// ============================================================

PlayerSchema.index({ updatedAt: 1 });
PlayerSchema.index({ campaign: 1 });

module.exports = mongoose.model("Player", PlayerSchema);
