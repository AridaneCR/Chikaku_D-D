const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  campaign: { type: String, default: "default" },

  name: { type: String, required: true, trim: true },
  life: { type: Number, default: 10 },

  // ✅ NUEVO SISTEMA DE HABILIDADES
  skills: { type: [String], default: [] },

  milestones: { type: String, default: "" },
  attributes: { type: String, default: "" },

  exp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },

  img: { type: String, default: null },        // base64
  items: { type: [String], default: [] },      // base64 imágenes

  // ✅ DESCRIPCIÓN DE OBJETOS
  itemDescriptions: { type: [String], default: [] },

}, {
  timestamps: true
});

module.exports = mongoose.model("player", PlayerSchema);
