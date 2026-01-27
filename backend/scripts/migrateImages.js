require("dotenv").config();
const mongoose = require("mongoose");

const extractPublicId = (url) => {
  if (!url || typeof url !== "string") return null;

  const idx = url.indexOf("/upload/");
  if (idx === -1) return null;

  let pid = url.slice(idx + 8);
  pid = pid.replace(/^v\d+\//, "");
  return pid;
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB conectado");

    const db = mongoose.connection.db;
    const collection = db.collection("players"); // ⚠️ nombre real

    const players = await collection.find({}).toArray();
    console.log(`👥 Jugadores encontrados: ${players.length}`);

    let updated = 0;

    for (const p of players) {
      let changed = false;
      const update = {};

      // 🔥 IMG PRINCIPAL
      if (typeof p.img === "string") {
        const pid = extractPublicId(p.img);
        if (pid) {
          update.img = { url: p.img, publicId: pid };
          changed = true;
          console.log("🖼️ Migrada img:", pid);
        }
      }

      // 🔥 ITEMS
      if (Array.isArray(p.items)) {
        const newItems = p.items.map(it => {
          if (typeof it === "string") {
            const pid = extractPublicId(it);
            if (pid) {
              changed = true;
              console.log("📦 Migrado item:", pid);
              return { url: it, publicId: pid };
            }
          }
          return it;
        });

        if (changed) update.items = newItems;
      }

      if (changed) {
        await collection.updateOne(
          { _id: p._id },
          { $set: update }
        );
        updated++;
      }
    }

    console.log(`🔥 MIGRACIÓN COMPLETADA. Jugadores actualizados: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
