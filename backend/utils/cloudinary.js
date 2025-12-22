// backend/utils/cloudinary.js

const cloudinary = require("cloudinary").v2;

// ⚠️ Usa variables de entorno (NUNCA claves hardcodeadas)
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
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    ).end(buffer);
  });
}

// ============================================================
// 🗑️ BORRAR IMAGEN (opcional)
// ============================================================

async function deleteImage(publicId) {
  if (!publicId) return;
  return cloudinary.uploader.destroy(publicId);
}

module.exports = {
  uploadBuffer,
  deleteImage,
};
