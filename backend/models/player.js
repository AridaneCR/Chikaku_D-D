const mongoose = require("mongoose");

// ============================================================
// PLAYER SCHEMA (CLOUDINARY READY + LEGACY SAFE)
// ============================================================

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

    life: { type: Number, default: 10 },
    ca: { type: Number, default: 10 },
    exp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    // 🪙 ORO
    gold: { type: Number, default: 0 },

    // 🪙 CHIKACOINS
    chikacoins: {
      type: Number,
      default: 100,
      min: 0,
    },

    milestones: { type: String, default: "" },
    attributes: { type: String, default: "" },
    class: { type: String, trim: true, default: "" },
    subclass: { type: String, trim: true, default: "" },

    skills: {
      type: [String],
      default: [],
    },

    img: {
      type: ImageSchema,
      default: null,
    },

    imgBase64: {
      type: String,
      default: null,
      select: false,
    },

    items: {
      type: [ImageSchema],
      default: [],
    },

    itemsBase64: {
      type: [String],
      default: [],
      select: false,
    },
