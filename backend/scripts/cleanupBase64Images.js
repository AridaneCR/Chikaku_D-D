/**
 * ============================================================
 * LIMPIEZA FINAL
 * - Elimina imgBase64 y itemsBase64
 * - SOLO si existen URLs Cloudinary válidas
 * ============================================================
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("../models/player");

async function cleanup() {
  try {
    console.log("🧹 Iniciando limpieza de base64...");

    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI no definido");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    const players = await Player.find();
    let cleaned = 0;

    for (const player of players) {
      let modified = false;

      // ------------------------------------------------------
      // IMAGEN PRINCIPAL
      // ------------------------------------------------------
      if (player.img && player.imgBase64) {
        player.imgBase64 = undefined;
        modified = true;
        console.log(`🗑 imgBase64 eliminado → ${player.name}`);
      }

      // ------------------------------------------------------
      // OBJETOS
      // ------------------------------------------------------
      if (
        Array.isArray(player.items) &&
        player.items.length &&
        player.itemsBase64 &&
        player.itemsBase64.length
      ) {
        player.itemsBase64 = undefined;
        modified = true;
        console.log(`🗑 itemsBase64 eliminado → ${player.name}`);
      }

      if (modified) {
        await player.save();
        cleaned++;
      }
    }

    console.log("\n🎉 LIMPIEZA COMPLETADA");
    console.log(`✅ Jugadores limpiados: ${cleaned}`);
    console.log("📉 MongoDB ahora es mucho más ligero");

    process.exit(0);

  } catch (err) {
    console.error("💥 ERROR EN LIMPIEZA:", err);
    process.exit(1);
  }
}

cleanup();
