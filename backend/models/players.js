// backend/models/Player.js
const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  campaign: { type: String, default: "default" },
  name: { type: String, required: true, trim: true },
  life: { type: Number, default: 10 },
  skill1: { type: String, default: "" },
  skill2: { type: String, default: "" },
  milestones: { type: String, default: "" },
  attributes: { type: String, default: "" },
  exp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  img: { type: String, default: null },       // base64 string (no prefix)
  items: { type: [String], default: [] },     // array of base64 strings
}, {
  timestamps: true
});

module.exports = mongoose.model("Player", PlayerSchema);
