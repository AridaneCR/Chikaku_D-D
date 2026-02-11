const mongoose = require("mongoose");

// ============================================================
// PLAYER SCHEMA (CLOUDINARY READY + LEGACY SAFE)
// ============================================================

// 🔥 Subschema reutilizable para imágenes Cloudinary
const ImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

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

    // 🪙 ORO
    gold: {
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
    class: {
      type: String,
      trim: true,
      default: "",
    },

    subclass: {
      type: String,
      trim: true,
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
    img: {
      type: ImageSchema,
      default: null,
    },

    // 🟡 LEGACY → base64 (por si hay datos antiguos)
    imgBase64: {
      type: String,
      default: null,
      select: false,
    },

    // -------------------------
    // 🔥 OBJETOS (IMÁGENES)
    // -------------------------
    items: {
      type: [ImageSchema],
      default: [],
    },

    // 🟡 LEGACY → base64
    itemsBase64: {
      type: [String],
      default: [],
      select: false,
    },

    // -------------------------
    // DESCRIPCIONES
    // -------------------------
    itemDescriptions: {
      type: [String],
      default: [],
    },

    passwordHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordSalt: {
      type: String,
      default: null,
      select: false,
    },
  },


  {
    timestamps: true, // 🔥 CLAVE para cache + ETag
  },
);

module.exports = mongoose.model("Player", PlayerSchema);
