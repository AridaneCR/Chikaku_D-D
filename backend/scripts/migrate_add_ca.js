require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("../models/player");

async function migrateCA() {

  try {

    await mongoose.connect(process.env.MONGO_URI);

    console.log("🟢 Conectado a MongoDB");

    const result = await Player.updateMany(
      { ca: { $exists: false } },
      { $set: { ca: 10 } }
    );

    console.log("🛡️ Jugadores actualizados:", result.modifiedCount);

    await mongoose.disconnect();

    console.log("✅ Migración completada");

  } catch (err) {

    console.error("❌ Error en migración:", err);

  }

}

migrateCA();