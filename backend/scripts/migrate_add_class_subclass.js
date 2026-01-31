/**
 * 🧹 MIGRACIÓN FINAL DE SANEADO
 * - Asegura gold, class y subclass en jugadores antiguos
 * - Corrige combinaciones inválidas
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("../models/player");

// 📚 Definición válida de clases y subclases
const CLASS_TREE = {
  guerrero: ["explorador", "luchador"],
  mago: ["arcano", "elemental"],
  apoyo: ["sanador", "monje"],
};

async function migrateSanitizePlayers() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI no definida en .env");
    }

    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("🔍 Cargando jugadores...");
    const players = await Player.find();

    let updatedCount = 0;

    for (const player of players) {
      let changed = false;

      // -------------------------
      // 🪙 GOLD
      // -------------------------
      if (typeof player.gold !== "number") {
        player.gold = 0;
        changed = true;
      }

      // -------------------------
      // 🧙 CLASS
      // -------------------------
      if (!player.class || !CLASS_TREE[player.class]) {
        player.class = "guerrero";
        player.subclass = "luchador";
        changed = true;
      }

      // -------------------------
      // 🧙‍♂️ SUBCLASS
      // -------------------------
      if (
        !player.subclass ||
        !CLASS_TREE[player.class].includes(player.subclass)
      ) {
        player.subclass = CLASS_TREE[player.class][0];
        changed = true;
      }

      if (changed) {
        await player.save();
        updatedCount++;
      }
    }

    console.log("✅ Migración completada");
    console.log(`🧹 Jugadores saneados: ${updatedCount}`);
  } catch (err) {
    console.error("❌ Error en la migración:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Conexión cerrada");
    process.exit(0);
  }
}

migrateSanitizePlayers();