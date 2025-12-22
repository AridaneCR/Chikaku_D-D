/**
 * ============================================================
 * MIGRACIÓN DE IMÁGENES BASE64 → CLOUDINARY
 * - Seguro
 * - Idempotente
 * - No borra base64 hasta confirmar URL
 * ============================================================
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("../models/player");
const { uploadBuffer } = require("../utils/cloudinary");

async function migrate() {
  try {
    console.log("🚀 Iniciando migración de imágenes...");

    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI no definido en .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    const players = await Player.find();
    console.log(`👥 Jugadores encontrados: ${players.length}`);

    let migratedCount = 0;

    for (const player of players) {
      let modified = false;

      console.log(`\n🧙 Revisando: ${player.name}`);

      // ======================================================
      // IMAGEN PRINCIPAL
      // ======================================================
      if (!player.img && player.imgBase64) {
        console.log("🖼 Migrando imagen principal...");

        const buffer = Buffer.from(player.imgBase64, "base64");
        const url = await uploadBuffer(buffer, "dnd/players");

        if (url) {
          player.img = url;
          console.log("✅ Imagen principal migrada");
          modified = true;
        }
      }

      // ======================================================
      // OBJETOS
      // ======================================================
      if (
        (!player.items || player.items.length === 0) &&
        Array.isArray(player.itemsBase64) &&
        player.itemsBase64.length
      ) {
        console.log("🎒 Migrando objetos...");

        player.items = player.items || [];

        for (const b64 of player.itemsBase64) {
          if (!b64) continue;

          const buffer = Buffer.from(b64, "base64");
          const url = await uploadBuffer(buffer, "dnd/items");

          if (url) {
            player.items.push(url);
          }
        }

        player.items = player.items.slice(0, 6);

        if (player.items.length) {
          console.log(`✅ Objetos migrados: ${player.items.length}`);
          modified = true;
        }
      }

      // ======================================================
      // GUARDAR
      // ======================================================
      if (modified) {
        await player.save();
        migratedCount++;
        console.log("💾 Jugador guardado");
      } else {
        console.log("✔️ No requiere migración");
      }
    }

    console.log("\n🎉 MIGRACIÓN COMPLETADA");
    console.log(`✅ Jugadores migrados: ${migratedCount}`);

    process.exit(0);

  } catch (err) {
    console.error("💥 ERROR EN MIGRACIÓN:", err);
    process.exit(1);
  }
}

migrate();
