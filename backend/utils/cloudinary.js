// backend/utils/cloudinary.js

const cloudinary = require("cloudinary").v2;

// ⚠️ Variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================================
// 📤 SUBIR IMAGEN (Buffer → URL CDN)
// ============================================================

async function uploadBuffer(buffer, folder = "dnd") {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: "jpg",
        transformation: [
          { width: 512, height: 512, crop: "limit" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url); // 🔥 SOLO URL
      }
    ).end(buffer);
  });
}

// ============================================================
// 🔥 ALIAS ESTABLE (para routes + scripts)
// ============================================================

async function uploadImage(buffer, folder) {
  return uploadBuffer(buffer, folder);
}

// ============================================================
// 🗑️ BORRAR IMAGEN
// ============================================================

async function deleteImage(publicId) {
  if (!publicId) return;
  return cloudinary.uploader.destroy(publicId);
}

module.exports = {
  uploadBuffer,
  uploadImage,   // ✅ ahora SÍ existe
  deleteImage,
};
