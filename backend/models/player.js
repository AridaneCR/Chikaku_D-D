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

    // ✅ NUEVO → Cloudinary URL
    img: {
      type: String,
      default: null,
    },

    // 🟡 LEGACY → base64 (se eliminará tras migración)
    imgBase64: {
      type: String,
      default: null,
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
    },

    itemDescriptions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt + updatedAt (🔥 para cache + ETag)
  }
);

// ============================================================
// 🔁 NORMALIZACIÓN AUTOMÁTICA
// (para que el frontend SIEMPRE reciba lo mismo)
// ============================================================

PlayerSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Imagen principal
  obj.img =
    obj.img ||
    (obj.imgBase64 ? `data:image/jpeg;base64,${obj.imgBase64}` : null);

  // Objetos
  obj.items =
    obj.items && obj.items.length
      ? obj.items
      : (obj.itemsBase64 || []).map((b64) =>
          b64 ? `data:image/jpeg;base64,${b64}` : null
        );

  // Limpio legacy si quieres ocultarlo al frontend
  delete obj.imgBase64;
  delete obj.itemsBase64;

  return obj;
};

module.exports = mongoose.model("Player", PlayerSchema);
