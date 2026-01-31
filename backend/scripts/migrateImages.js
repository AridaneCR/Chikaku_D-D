const mongoose = require("mongoose");
const Player = require("../models/player");
require("dotenv").config(); // ✅ CORRECTO

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI no definido en .env");
  process.exit(1);
}

async function migrateClassAndSubclass() {
  try {
    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(MONGO_URI);

    console.log("🔍 Buscando jugadores antiguos...");

    const result = await Player.updateMany(
      {
        $or: [
          { class: { $exists: false } },
          { subclass: { $exists: false } },
        ],
      },
      {
        $set: {
          class: "Guerrero",
          subclass: "Luchador",
        },
      }
    );

    console.log("✅ Migración completada");
    console.log(`🧙 Jugadores actualizados: ${result.modifiedCount}`);

    await mongoose.disconnect();
    console.log("🔌 Conexión cerrada");
  } catch (err) {
    console.error("❌ Error en la migración:", err);
    process.exit(1);
  }
}

migrateClassAndSubclass();