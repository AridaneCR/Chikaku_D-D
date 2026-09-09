const mongoose = require("mongoose");

// ============================================================
// IMAGEN CLOUDINARY
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
  { _id: false }
);

// ============================================================
// PRODUCT SCHEMA
// ============================================================

const ProductSchema = new mongoose.Schema(
  {
    // --------------------------------------------------------
    // CAMPAÑA
    // --------------------------------------------------------
    campaign: {
      type: String,
      default: "default",
      index: true,
    },

    // --------------------------------------------------------
    // PRODUCTO
    // --------------------------------------------------------
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    // --------------------------------------------------------
    // CÓDIGO DE BARRAS
    // --------------------------------------------------------
    barcode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // --------------------------------------------------------
    // IMAGEN
    // --------------------------------------------------------
    image: {
      type: ImageSchema,
      default: null,
    },

    // --------------------------------------------------------
    // PRECIOS
    // --------------------------------------------------------

    // Precio en dinero real interno.
    // Ejemplo: 5,50 € -> 550
    priceCents: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Precio en Chikacoins.
    chikacoinPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // --------------------------------------------------------
    // ESTADO
    // --------------------------------------------------------
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// ÍNDICE
// ============================================================

ProductSchema.index({
  campaign: 1,
  barcode: 1,
});

module.exports = mongoose.model("Product", ProductSchema);