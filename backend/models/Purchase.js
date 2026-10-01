const mongoose = require("mongoose");

const PurchaseSchema = new mongoose.Schema(
  {
    campaign: {
      type: String,
      default: "default",
      index: true,
    },

    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
    },

    chikacoins: {
      type: Number,
      required: true,
      min: 0,
    },

    chikacoinsBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    chikacoinsAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    productBarcode: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

PurchaseSchema.index({ player: 1, createdAt: -1 });

module.exports = mongoose.model("Purchase", PurchaseSchema);
