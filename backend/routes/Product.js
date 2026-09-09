const express = require("express");
const router = express.Router();
const multer = require("multer");

const Product = require("../models/Product");
const {
  uploadImage,
  deleteImage,
} = require("../utils/cloudinary");

const upload = multer({
  storage: multer.memoryStorage(),
});

// ============================================================
// NORMALIZAR PRODUCTO
// ============================================================

function normalizeProduct(product) {
  if (!product) return null;

  const image =
    product.image?.url ||
    product.image?.secure_url ||
    null;

  return {
    _id: product._id,
    campaign: product.campaign || "default",

    name: product.name || "",
    description: product.description || "",
    barcode: product.barcode || "",

    image,

    priceCents: Number(product.priceCents) || 0,
    chikacoinPrice: Number(product.chikacoinPrice) || 0,

    active: product.active !== false,

    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

// ============================================================
// GET ALL PRODUCTS
// ============================================================

router.get("/", async (req, res) => {
  try {
    const campaign = req.query.campaign || "default";

    const products = await Product.find({
      campaign,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(products.map(normalizeProduct));
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);

    res.status(500).json({
      error: "Error obteniendo productos",
    });
  }
});

// ============================================================
// GET PRODUCT BY BARCODE
// ============================================================

router.get("/barcode/:barcode", async (req, res) => {
  try {
    const barcode = String(req.params.barcode).trim();

    if (!barcode) {
      return res.status(400).json({
        error: "Código de barras inválido",
      });
    }

    const campaign = req.query.campaign || "default";

    const product = await Product.findOne({
      barcode,
      campaign,
      active: true,
    }).lean();

    if (!product) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    res.json(normalizeProduct(product));
  } catch (err) {
    console.error("GET PRODUCT BARCODE ERROR:", err);

    res.status(500).json({
      error: "Error buscando producto",
    });
  }
});

// ============================================================
// GET PRODUCT BY ID
// ============================================================

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    res.json(normalizeProduct(product));
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);

    res.status(500).json({
      error: "Error obteniendo producto",
    });
  }
});

// ============================================================
// CREATE PRODUCT
// ============================================================

router.post(
  "/",
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        campaign,
        name,
        description,
        barcode,
        priceCents,
        chikacoinPrice,
        active,
      } = req.body;

      // --------------------------------------------------------
      // VALIDACIONES
      // --------------------------------------------------------

      if (!name?.trim()) {
        return res.status(400).json({
          error: "El nombre del producto es obligatorio",
        });
      }

      if (!barcode?.trim()) {
        return res.status(400).json({
          error: "El código de barras es obligatorio",
        });
      }

      const parsedPrice = Number(priceCents);
      const parsedChikacoinPrice = Number(chikacoinPrice);

      if (
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0
      ) {
        return res.status(400).json({
          error: "Precio en dinero inválido",
        });
      }

      if (
        !Number.isFinite(parsedChikacoinPrice) ||
        parsedChikacoinPrice < 0
      ) {
        return res.status(400).json({
          error: "Precio en Chikacoins inválido",
        });
      }

      // --------------------------------------------------------
      // COMPROBAR CÓDIGO DE BARRAS
      // --------------------------------------------------------

      const existingProduct = await Product.findOne({
        barcode: barcode.trim(),
      });

      if (existingProduct) {
        return res.status(409).json({
          error: "Ya existe un producto con ese código de barras",
        });
      }

      // --------------------------------------------------------
      // IMAGEN
      // --------------------------------------------------------

      let image = null;

      if (req.file) {
        image = await uploadImage(
          req.file.buffer,
          "products"
        );
      }

      // --------------------------------------------------------
      // CREAR PRODUCTO
      // --------------------------------------------------------

      const product = new Product({
        campaign: campaign || "default",

        name: name.trim(),

        description:
          description?.trim() || "",

        barcode:
          barcode.trim(),

        image,

        priceCents:
          Math.round(parsedPrice),

        chikacoinPrice:
          Math.round(parsedChikacoinPrice),

        active:
          active === undefined
            ? true
            : active !== "false" && active !== false,
      });

      const saved = await product.save();

      res.status(201).json({
        ok: true,
        product: normalizeProduct(saved),
      });
    } catch (err) {
      console.error("CREATE PRODUCT ERROR:", err);

      res.status(500).json({
        error: "Error creando producto",
      });
    }
  }
);

// ============================================================
// UPDATE PRODUCT
// ============================================================

router.put(
  "/:id",
  upload.single("image"),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          error: "Producto no encontrado",
        });
      }

      // --------------------------------------------------------
      // DATOS
      // --------------------------------------------------------

      if (req.body.name !== undefined) {
        if (!req.body.name.trim()) {
          return res.status(400).json({
            error: "El nombre no puede estar vacío",
          });
        }

        product.name = req.body.name.trim();
      }

      if (req.body.description !== undefined) {
        product.description =
          req.body.description.trim();
      }

      if (req.body.barcode !== undefined) {
        const newBarcode =
          req.body.barcode.trim();

        if (!newBarcode) {
          return res.status(400).json({
            error: "El código de barras no puede estar vacío",
          });
        }

        const duplicate = await Product.findOne({
          barcode: newBarcode,
          _id: { $ne: product._id },
        });

        if (duplicate) {
          return res.status(409).json({
            error:
              "Ya existe otro producto con ese código de barras",
          });
        }

        product.barcode = newBarcode;
      }

      if (req.body.campaign !== undefined) {
        product.campaign =
          req.body.campaign || "default";
      }

      // --------------------------------------------------------
      // PRECIO DINERO
      // --------------------------------------------------------

      if (req.body.priceCents !== undefined) {
        const price = Number(req.body.priceCents);

        if (!Number.isFinite(price) || price < 0) {
          return res.status(400).json({
            error: "Precio en dinero inválido",
          });
        }

        product.priceCents = Math.round(price);
      }

      // --------------------------------------------------------
      // PRECIO CHIKACOINS
      // --------------------------------------------------------

      if (req.body.chikacoinPrice !== undefined) {
        const price =
          Number(req.body.chikacoinPrice);

        if (!Number.isFinite(price) || price < 0) {
          return res.status(400).json({
            error: "Precio en Chikacoins inválido",
          });
        }

        product.chikacoinPrice =
          Math.round(price);
      }

      // --------------------------------------------------------
      // ACTIVO
      // --------------------------------------------------------

      if (req.body.active !== undefined) {
        product.active =
          req.body.active === true ||
          req.body.active === "true";
      }

      // --------------------------------------------------------
      // NUEVA IMAGEN
      // --------------------------------------------------------

      if (req.file) {
        if (product.image) {
          await deleteImage(product.image);
        }

        product.image =
          await uploadImage(
            req.file.buffer,
            "products"
          );
      }

      product.updatedAt = new Date();

      const saved = await product.save();

      res.json({
        ok: true,
        product: normalizeProduct(saved),
      });
    } catch (err) {
      console.error("UPDATE PRODUCT ERROR:", err);

      res.status(500).json({
        error: "Error actualizando producto",
      });
    }
  }
);

// ============================================================
// ACTIVATE / DEACTIVATE PRODUCT
// ============================================================

router.patch("/:id/active", async (req, res) => {
  try {
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({
        error: "Estado inválido",
      });
    }

    const product =
      await Product.findByIdAndUpdate(
        req.params.id,
        {
          active,
          updatedAt: new Date(),
        },
        {
          new: true,
        }
      );

    if (!product) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    res.json({
      ok: true,
      product: normalizeProduct(product),
    });
  } catch (err) {
    console.error(
      "UPDATE PRODUCT ACTIVE ERROR:",
      err
    );

    res.status(500).json({
      error: "Error cambiando estado del producto",
    });
  }
});

// ============================================================
// DELETE PRODUCT
// ============================================================

router.delete("/:id", async (req, res) => {
  try {
    const product =
      await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    // --------------------------------------------------------
    // BORRAR IMAGEN CLOUDINARY
    // --------------------------------------------------------

    if (product.image) {
      await deleteImage(product.image);
    }

    await product.deleteOne();

    res.json({
      ok: true,
    });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);

    res.status(500).json({
      error: "Error eliminando producto",
    });
  }
});

module.exports = router;