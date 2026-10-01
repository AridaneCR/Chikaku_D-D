require("dotenv").config();

const mongoose = require("mongoose");
const Player = require("../models/player");

async function seedChikacoins() {
  if (!process.env.MONGO_URI) {
    throw new Error("Falta la variable de entorno MONGO_URI");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB conectado");

  const result = await Player.updateMany(
    {},
    { $set: { chikacoins: 100 } },
  );

  console.log(`✅ Personajes actualizados: ${result.modifiedCount}`);
  console.log("🪙 Todos los personajes tienen ahora 100 Chikacoins.");
}

seedChikacoins()
  .catch((error) => {
    console.error("❌ Error asignando Chikacoins:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
