require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("../models/Product");

async function migrate() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI no definido en .env");
    }

    console.log("🔄 Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB conectado");

    // MongoDB no necesita una migración para añadir campos,
    // pero dejamos preparados los documentos existentes.
    const result = await Product.updateMany(
      {},
      [
        {
          $set: {
            campaign: { $ifNull: ["$campaign", "default"] },
            description: { $ifNull: ["$description", ""] },
            image: { $ifNull: ["$image", null] },
            priceCents: { $ifNull: ["$priceCents", 0] },
            chikacoinPrice: { $ifNull: ["$chikacoinPrice", 0] },
            active: { $ifNull: ["$active", true] },
          },
        },
      ]
    );

    console.log(`✅ Documentos actualizados: ${result.modifiedCount}`);

    // Crea/actualiza los índices definidos en Product.js.
    // Si ya existen, Mongoose los conserva.
    await Product.createCollection().catch(() => {});
    await Product.syncIndexes();

    console.log("✅ Índices de Product sincronizados");
    console.log("🎉 Migración de productos completada");
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB desconectado");
  }
}

migrate();
