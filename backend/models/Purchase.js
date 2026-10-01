const mongoose = require("mongoose");

const PurchaseSchema = new mongoose.Schema(
  {
    campaign: { type: String, default: "default", index: true },

    // Usuario que realizó la compra. Es la referencia principal del historial.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Se conserva el personaje para mantener compatibilidad con compras antiguas.
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

    productName: { type: String, required: true },
    chikacoins: { type: Number, required: true, min: 0 },
    chikacoinsBefore: { type: Number, required: true, min: 0 },
    chikacoinsAfter: { type: Number, required: true, min: 0 },
    productBarcode: { type: String, default: "" },
  },
  { timestamps: true },
);

PurchaseSchema.index({ user: 1, createdAt: -1 });
PurchaseSchema.index({ player: 1, createdAt: -1 });

module.exports = mongoose.model("Purchase", PurchaseSchema);
