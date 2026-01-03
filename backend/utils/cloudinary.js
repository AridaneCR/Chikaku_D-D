// backend/utils/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================================
// 📤 SUBIR IMAGEN (Buffer → { url, publicId })
// ============================================================
async function uploadBuffer(buffer, folder = "dnd") {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: uuidv4(), // 🔥 SIEMPRE ÚNICO
        overwrite: true,     // 🔒 evita reutilización
        resource_type: "image",
        transformation: [
          { width: 512, height: 512, crop: "limit" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    ).end(buffer);
  });
}


async function uploadImage(buffer, folder) {
  return uploadBuffer(buffer, folder);
}

// ============================================================
// 🗑️ BORRAR IMAGEN (SIEMPRE CON publicId)
// ============================================================
async function deleteImage(image) {
  if (!image) return;

  const publicId =
    typeof image === "string"
      ? image
      : image.publicId;

  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn("⚠️ Cloudinary delete error:", err.message);
  }
}

module.exports = {
  uploadImage,
  deleteImage,
};
