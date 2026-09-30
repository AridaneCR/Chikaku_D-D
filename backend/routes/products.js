const express = require("express");
const multer = require("multer");

const Product = require("../models/Product");
const { uploadImage, deleteImage } = require("../utils/cloudinary");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

function normalizeProduct(product) {
  return {
    _id: product._id,
    campaign: product.campaign,
    name: product.name,
    description: product.description,
    barcode: product.barcode,
    image: product.image?.url || null,
    priceCents: product.priceCents,
    chikacoinPrice: product.chikacoinPrice,
    active: product.active,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const campaign = req.query.campaign || "default";

    const products = await Product.find({ campaign })
      .sort({ createdAt: -1 })
      .lean();

    res.json(products.map(normalizeProduct));
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// GET /api/products/barcode/:barcode
router.get("/barcode/:barcode", async (req, res) => {
  try {
    const campaign = req.query.campaign || "default";

    const product = await Product.findOne({
      barcode: req.params.barcode,
      campaign,
      active: true,
    }).lean();

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(normalizeProduct(product));
  } catch (error) {
    console.error("Error buscando producto por código de barras:", error);
    res.status(500).json({ error: "Error al buscar producto" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(normalizeProduct(product));
  } catch (error) {
    console.error("Error obteniendo producto:", error);
    res.status(400).json({ error: "ID de producto no válido" });
  }
});

// POST /api/products
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      campaign = "default",
      name,
      description = "",
      barcode,
      priceCents,
      chikacoinPrice,
      active = true,
    } = req.body;

    if (!name || !barcode || priceCents === undefined || chikacoinPrice === undefined) {
      return res.status(400).json({
        error: "name, barcode, priceCents y chikacoinPrice son obligatorios",
      });
    }

    const existing = await Product.findOne({ barcode });
    if (existing) {
      return res.status(409).json({
        error: "Ya existe un producto con ese código de barras",
      });
    }

    let image = null;

    if (req.file) {
      image = await uploadImage(req.file.buffer, "products");
    }

    const product = await Product.create({
      campaign,
      name,
      description,
      barcode,
      priceCents: Number(priceCents),
      chikacoinPrice: Number(chikacoinPrice),
      active: active === true || active === "true",
      image,
    });

    res.status(201).json(normalizeProduct(product));
  } catch (error) {
    console.error("Error creando producto:", error);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// PUT /api/products/:id
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const {
      campaign,
      name,
      description,
      barcode,
      priceCents,
      chikacoinPrice,
      active,
    } = req.body;

    if (barcode && barcode !== product.barcode) {
      const existing = await Product.findOne({
        barcode,
        _id: { $ne: product._id },
      });

      if (existing) {
        return res.status(409).json({
          error: "Ya existe un producto con ese código de barras",
        });
      }

      product.barcode = barcode;
    }

    if (campaign !== undefined) product.campaign = campaign;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (priceCents !== undefined) product.priceCents = Number(priceCents);
    if (chikacoinPrice !== undefined) {
      product.chikacoinPrice = Number(chikacoinPrice);
    }
    if (active !== undefined) {
      product.active = active === true || active === "true";
    }

    if (req.file) {
      if (product.image?.publicId) {
        try {
          await deleteImage(product.image);
        } catch (imageError) {
          console.error("Error eliminando imagen anterior:", imageError);
        }
      }

      product.image = await uploadImage(req.file.buffer, "products");
    }

    await product.save();

    res.json(normalizeProduct(product));
  } catch (error) {
    console.error("Error actualizando producto:", error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// PATCH /api/products/:id/active
router.patch("/:id/active", async (req, res) => {
  try {
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({
        error: "active debe ser boolean",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(normalizeProduct(product));
  } catch (error) {
    console.error("Error cambiando estado del producto:", error);
    res.status(500).json({ error: "Error al cambiar estado" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    if (product.image?.publicId) {
      try {
        await deleteImage(product.image);
      } catch (imageError) {
        console.error("Error eliminando imagen de Cloudinary:", imageError);
      }
    }

    await product.deleteOne();

    res.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando producto:", error);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

module.exports = router;
