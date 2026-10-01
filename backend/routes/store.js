const express = require("express");
const mongoose = require("mongoose");

const Player = require("../models/player");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");

const router = express.Router();

function normalizePurchase(purchase) {
  return {
    _id: purchase._id,
    player: purchase.player,
    product: purchase.product,
    productName: purchase.productName,
    productBarcode: purchase.productBarcode,
    chikacoins: purchase.chikacoins,
    chikacoinsBefore: purchase.chikacoinsBefore,
    chikacoinsAfter: purchase.chikacoinsAfter,
    createdAt: purchase.createdAt,
  };
}

// POST /api/store/purchase
// Comprueba saldo -> descuenta -> añade el objeto -> registra la compra.
router.post("/purchase", async (req, res) => {
  const { playerId, productId } = req.body;

  if (!playerId || !productId) {
    return res.status(400).json({
      error: "playerId y productId son obligatorios",
    });
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const product = await Product.findOne({
        _id: productId,
        active: true,
      }).session(session);

      if (!product) {
        const error = new Error("Producto no disponible");
        error.status = 404;
        throw error;
      }

      const price = Math.max(0, Math.floor(Number(product.chikacoinPrice) || 0));

      const player = await Player.findById(playerId).session(session);

      if (!player) {
        const error = new Error("Jugador no encontrado");
        error.status = 404;
        throw error;
      }

      const balanceBefore = Math.max(0, Number(player.chikacoins) || 0);

      if (balanceBefore < price) {
        const error = new Error("No tienes suficientes Chikacoins");
        error.status = 400;
        error.code = "INSUFFICIENT_CHIKACOINS";
        error.balance = balanceBefore;
        error.price = price;
        throw error;
      }

      const balanceAfter = balanceBefore - price;

      // El inventario actual está basado en imágenes + descripciones.
      // Si el producto no tiene imagen, usamos un placeholder compatible
      // con el esquema actual para que la compra siga siendo un objeto válido.
      const inventoryImage = product.image?.url
        ? {
            url: product.image.url,
            publicId: product.image.publicId || "store-placeholder",
          }
        : {
            url: "/placeholder.png",
            publicId: "store-placeholder",
          };

      // La condición de saldo evita que dos compras simultáneas gasten
      // el mismo saldo. La transacción protege además el registro de compra.
      const updatedPlayer = await Player.findOneAndUpdate(
        {
          _id: playerId,
          chikacoins: { $gte: price },
        },
        {
          $inc: { chikacoins: -price },
          $push: {
            items: inventoryImage,
            itemDescriptions: product.description || product.name,
          },
          $set: { updatedAt: new Date() },
        },
        { new: true, session },
      );

      if (!updatedPlayer) {
        const error = new Error("El saldo ha cambiado. No se pudo completar la compra");
        error.status = 409;
        throw error;
      }

      const purchase = await Purchase.create(
        [
          {
            campaign: player.campaign || product.campaign || "default",
            player: player._id,
            product: product._id,
            productName: product.name,
            productBarcode: product.barcode,
            chikacoins: price,
            chikacoinsBefore: balanceBefore,
            chikacoinsAfter: balanceAfter,
          },
        ],
        { session },
      );

      result = {
        player: updatedPlayer,
        purchase: purchase[0],
        product,
      };
    });

    const notify = req.app.get("notifyPlayersUpdate");
    notify?.();

    res.status(201).json({
      ok: true,
      message: "Compra realizada correctamente",
      chikacoins: result.player.chikacoins,
      player: result.player,
      purchase: normalizePurchase(result.purchase),
    });
  } catch (error) {
    console.error("STORE PURCHASE ERROR:", error);

    if (error.status) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
        balance: error.balance,
        price: error.price,
      });
    }

    res.status(500).json({
      error: "No se pudo completar la compra",
    });
  } finally {
    await session.endSession();
  }
});

// GET /api/store/purchases/:playerId
router.get("/purchases/:playerId", async (req, res) => {
  try {
    const purchases = await Purchase.find({ player: req.params.playerId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(purchases.map(normalizePurchase));
  } catch (error) {
    console.error("STORE PURCHASE HISTORY ERROR:", error);
    res.status(500).json({ error: "No se pudo obtener el historial de compras" });
  }
});

module.exports = router;
