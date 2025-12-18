const mongoose = require("mongoose");
const Player = require("../models/player");

// 🔗 Conecta a Mongo (usa la MISMA URI que tu backend)
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function migrate() {
  try {
    console.log("🚀 Iniciando migración de jugadores...");

    const players = await Player.find();

    for (const player of players) {
      let changed = false;

      // 🔄 MIGRAR skill1 / skill2 → skills[]
      if (!Array.isArray(player.skills) || player.skills.length === 0) {
        const newSkills = [];

        if (player.skill1 && player.skill1.trim() !== "") {
          newSkills.push(player.skill1.trim());
        }

        if (player.skill2 && player.skill2.trim() !== "") {
          newSkills.push(player.skill2.trim());
        }

        if (newSkills.length > 0) {
          player.skills = newSkills;
          changed = true;
        }
      }

      // 🧹 ELIMINAR CAMPOS ANTIGUOS
      if (player.skill1 !== undefined || player.skill2 !== undefined) {
        player.skill1 = undefined;
        player.skill2 = undefined;
        changed = true;
      }

      // 📦 ASEGURAR itemDescriptions
      if (!Array.isArray(player.itemDescriptions)) {
        player.itemDescriptions = [];
        changed = true;
      }

      if (changed) {
        await player.save();
        console.log(`✅ Migrado: ${player.name}`);
      }
    }

    console.log("🎉 Migración completada con éxito");
    process.exit(0);

  } catch (err) {
    console.error("❌ Error en migración:", err);
    process.exit(1);
  }
}

migrate();
