const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  campaign: String,
  name: String,
  life: Number,
  skill1: String,
  skill2: String,
  milestones: String,
  attributes: String,
  exp: Number,
  level: Number,
  img: String, // Base64
  items: [String] // Base64 imágenes
});

module.exports = mongoose.model("Player", PlayerSchema);
