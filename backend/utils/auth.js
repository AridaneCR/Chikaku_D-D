const crypto = require("crypto");
const User = require("../models/User");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(derived, "hex"),
    Buffer.from(hash, "hex"),
  );
}

function createSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

async function requireUser(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!token) return res.status(401).json({ error: "Sesión requerida" });

    const user = await User.findOne({ sessionToken: token }).select("+sessionToken");
    if (!user) return res.status(401).json({ error: "Sesión inválida o caducada" });

    req.user = user;
    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);
    res.status(500).json({ error: "Error comprobando la sesión" });
  }
}

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    player: user.player || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSessionToken,
  requireUser,
  publicUser,
};
