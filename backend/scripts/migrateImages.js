/**
 * MIGRACIÓN DE IMÁGENES LEGACY A FORMATO CLOUDINARY
 *
 * Convierte:
 *  - img: "https://res.cloudinary.com/..."
 *  - items: ["https://res.cloudinary.com/..."]
 *
 * A:
 *  - img: { url, publicId }
 *  - items: [{ url, publicId }]
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("../models/player");

// ============================================================
// CONFIG
// ============================================================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI no definido");
  process.exit(1);
}

// ============================================================
// UTIL
// ============================================================
function extractPublicId(url) {
  try {
    // https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg
    const parts = url.split("/upload/");
    if (!parts[1]) return null;

    return parts[1]
      .replace(/^v\d+\//, "") // quita versión
      .replace(/\.[a-zA-Z0-9]+$/, ""); // quita extensión
  } catch {
    return null;
  }
}

// ============================================================
// MAIN
// ============================================================
async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB conectado");

  const players = await Player.find({});
  console.log(`🔎 Jugadores encontrados: ${players.length}`);

  let migrated = 0;

  for (const p of players) {
    let changed = false;

    // -------------------------
    // IMAGEN PRINCIPAL
    // -------------------------
    if (typeof p.img === "string" && p.img.startsWith("http")) {
      const publicId = extractPublicId(p.img);

      if (publicId) {
        p.img = {
          url: p.img,
          publicId,
        };
        changed = true;
        console.log(`🖼️ Migrada img → ${p.name}`);
      }
    }

    // -------------------------
    // ITEMS
    // -------------------------
    if (Array.isArray(p.items)) {
      const newItems = [];

      for (const item of p.items) {
        if (typeof item === "string" && item.startsWith("http")) {
          const publicId = extractPublicId(item);
          if (publicId) {
            newItems.push({ url: item, publicId });
            changed = true;
          }
        } else {
          newItems.push(item); // ya migrado
        }
      }

      if (changed) {
        p.items = newItems;
      }
    }

    if (changed) {
      p.markModified("img");
      p.markModified("items");
      await p.save();
      migrated++;
    }
  }

  console.log(`✅ Migración completada. Jugadores actualizados: ${migrated}`);
  process.exit(0);
}

// ============================================================
migrate().catch(err => {
  console.error("❌ Error en migración:", err);
  process.exit(1);
});
