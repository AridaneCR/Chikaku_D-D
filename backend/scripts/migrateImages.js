/**
 * MIGRACIÓN DE IMÁGENES LEGACY → CLOUDINARY (OPCIÓN A)
 * - img: string/base64 → { url, publicId }
 * - items: [string] → [{ url, publicId }]
 * Seguro e idempotente
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("../models/player");
const { uploadImage } = require("../utils/cloudinary");

// ===============================
// CONEXIÓN
// ===============================
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI no definido");
  process.exit(1);
}

// ===============================
// HELPERS
// ===============================
async function uploadFromUrl(url, folder) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error descargando imagen");
  const buffer = Buffer.from(await res.arrayBuffer());
  return uploadImage(buffer, folder);
}

async function uploadFromBase64(base64, folder) {
  const buffer = Buffer.from(
    base64.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );
  return uploadImage(buffer, folder);
}

// ===============================
// MIGRACIÓN
// ===============================
async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Conectado a MongoDB");

  const players = await Player.find().select("+imgBase64 +itemsBase64");
  console.log(`🔍 Jugadores encontrados: ${players.length}`);

  for (const player of players) {
    let changed = false;

    // -------- IMG PRINCIPAL --------
    if (typeof player.img === "string") {
      console.log(`🖼️ Migrando img URL → ${player.name}`);
      player.img = await uploadFromUrl(player.img, "players");
      changed = true;
    } else if (!player.img && player.imgBase64) {
      console.log(`🖼️ Migrando img base64 → ${player.name}`);
      player.img = await uploadFromBase64(player.imgBase64, "players");
      changed = true;
    }

    // -------- ITEMS --------
    if (Array.isArray(player.items) && player.items.length) {
      const migrated = [];

      for (let i = 0; i < player.items.length; i++) {
        const it = player.items[i];
        if (typeof it === "string") {
          console.log(`📦 Migrando item ${i} → ${player.name}`);
          migrated[i] = await uploadFromUrl(it, "items");
          changed = true;
        } else {
          migrated[i] = it;
        }
      }

      if (changed) player.items = migrated;
    }

    // -------- GUARDAR --------
    if (changed) {
      player.markModified("img");
      player.markModified("items");
      await player.save();
      console.log(`✅ ${player.name} migrado`);
    }
  }

  console.log("🎉 MIGRACIÓN COMPLETADA");
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌ ERROR EN MIGRACIÓN:", err);
  process.exit(1);
});
