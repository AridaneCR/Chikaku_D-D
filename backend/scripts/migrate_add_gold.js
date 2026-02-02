/**
 * 🪙 MIGRACIÓN: Añadir campo GOLD a jugadores antiguos
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("../models/player");

async function migrateGold() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI no definida en .env");
    }

    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("🔍 Buscando jugadores sin campo gold...");

    const result = await Player.updateMany(
      { gold: { $exists: false } },
      { $set: { gold: 0 } }
    );

    console.log("✅ Migración completada");
    console.log(`🪙 Jugadores actualizados: ${result.modifiedCount}`);

  } catch (err) {
    console.error("❌ Error en la migración:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Conexión cerrada");
    process.exit(0);
  }
}

migrateGold();
