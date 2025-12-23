require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Player = require("../models/player");
const { uploadImage } = require("../utils/cloudinary");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Conectado a MongoDB");

  const players = await Player.find({
    img: { $type: "string", $regex: "^/9j/" }
  });

  console.log(`🔍 Jugadores a migrar: ${players.length}`);

  for (const player of players) {
    console.log(`➡️ Migrando: ${player.name}`);

    // 🔥 IMAGEN PRINCIPAL
    if (player.img && player.img.startsWith("/9j/")) {
      const buffer = Buffer.from(player.img, "base64");
      const url = await uploadImage(buffer, "players");
      player.img = url;
      console.log("  ✅ Imagen principal subida");
    }

    // 🔥 OBJETOS
    if (Array.isArray(player.items)) {
      const newItems = [];

      for (const item of player.items) {
        if (typeof item === "string" && item.startsWith("/9j/")) {
          const buffer = Buffer.from(item, "base64");
          const url = await uploadImage(buffer, "items");
          newItems.push(url);
        } else {
          newItems.push(item);
        }
      }

      player.items = newItems;
      console.log("  ✅ Objetos subidos");
    }

    await player.save();
  }

  console.log("🎉 MIGRACIÓN COMPLETADA");
  process.exit(0);
}

migrate();
