require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");

const products = [
  {
    campaign: "default",
    name: "Espada larga",
    description: "Una espada larga equilibrada para combate cuerpo a cuerpo.",
    barcode: "TEST-ESPADA-001",
    priceCents: 0,
    chikacoinPrice: 50,
    active: true,
  },
  {
    campaign: "default",
    name: "Escudo de acero",
    description: "Un escudo resistente de acero para protegerse durante el combate.",
    barcode: "TEST-ESCUDO-001",
    priceCents: 0,
    chikacoinPrice: 75,
    active: true,
  },
  {
    campaign: "default",
    name: "Poción de curación",
    description: "Una poción que restaura puntos de vida al aventurero.",
    barcode: "TEST-POTION-001",
    priceCents: 0,
    chikacoinPrice: 25,
    active: true,
  },
  {
    campaign: "default",
    name: "Arco corto",
    description: "Un arco ligero y manejable para ataques a distancia.",
    barcode: "TEST-ARCO-001",
    priceCents: 0,
    chikacoinPrice: 60,
    active: true,
  },
  {
    campaign: "default",
    name: "Bastón mágico",
    description: "Un bastón imbuido de energía mágica para personajes aventureros.",
    barcode: "TEST-BASTON-001",
    priceCents: 0,
    chikacoinPrice: 100,
    active: true,
  },
];

async function seedProducts() {
  if (!process.env.MONGO_URI) {
    throw new Error("Falta la variable de entorno MONGO_URI");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB conectado");

  for (const product of products) {
    const saved = await Product.findOneAndUpdate(
      { barcode: product.barcode },
      { $set: product },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    console.log(
      `✅ ${saved.name} | ${saved.chikacoinPrice} Chikacoins | ${saved.barcode}`
    );
  }

  console.log(`\n🎉 ${products.length} productos cargados correctamente.`);
}

seedProducts()
  .catch((error) => {
    console.error("❌ Error cargando productos:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
