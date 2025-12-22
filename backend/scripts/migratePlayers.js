/**
 * ============================================================
 * MIGRACIÓN DE JUGADORES
 * - Convierte skills antiguas a array
 * - Añade itemDescriptions si no existen
 * - Limpia datos corruptos
 * ============================================================


require("dotenv").config();

const mongoose = require("mongoose");
const Player = require("../models/player");

async function migratePlayers() {
  try {
    console.log("🚀 Iniciando migración de jugadores...");

    // 🔐 Comprobación de seguridad
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI no está definido en el archivo .env");
    }

    // 🔌 Conexión a MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Conectado a MongoDB");

    const players = await Player.find();

    if (!players.length) {
      console.log("ℹ️ No hay jugadores que migrar");
      process.exit(0);
    }

    for (const player of players) {
      let modified = false;

      // ================================
      // MIGRAR SKILLS
      // ================================
      if (!Array.isArray(player.skills)) {
        console.log(`🔁 Migrando skills de ${player.name}`);
        player.skills = [];
        modified = true;
      }

      // Eliminar valores vacíos
      const cleanSkills = player.skills.filter(
        s => typeof s === "string" && s.trim() !== ""
      );

      if (cleanSkills.length !== player.skills.length) {
        player.skills = cleanSkills;
        modified = true;
      }

      // ================================
      // MIGRAR DESCRIPCIÓN DE OBJETOS
      // ================================
      if (!Array.isArray(player.itemDescriptions)) {
        console.log(`🔁 Migrando itemDescriptions de ${player.name}`);
        player.itemDescriptions = [];
        modified = true;
      }

      // Ajustar longitud a máx 6
      if (player.itemDescriptions.length > 6) {
        player.itemDescriptions = player.itemDescriptions.slice(0, 6);
        modified = true;
      }

      // ================================
      // GUARDAR CAMBIOS
      // ================================
      if (modified) {
        await player.save();
        console.log(`✅ Jugador migrado: ${player.name}`);
      } else {
        console.log(`✔️ ${player.name} ya estaba correcto`);
      }
    }

    console.log("🎉 Migración completada con éxito");
    process.exit(0);

  } catch (error) {
    console.error("💥 ERROR EN MIGRACIÓN:", error);
    process.exit(1);
  }
}

migratePlayers();
 */