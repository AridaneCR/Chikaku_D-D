const crypto = require("crypto");

const TOKEN_SECRET = process.env.AUTH_SECRET || "chikaku-auth-secret";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  const computed = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computed));
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload) {
  return crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateToken(payload, expiresInSeconds = 60 * 60 * 12) {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const encodedPayload = base64url(JSON.stringify(body));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8"));

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

function extractTokenFromReq(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  if (typeof req.query.token === "string" && req.query.token.trim()) {
    return req.query.token.trim();
  }

  return null;
}

function authenticateAny(req, res, next) {
  const token = extractTokenFromReq(req);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "No autorizado" });
  }

  req.auth = payload;
  next();
}

function authenticateMaster(req, res, next) {
  const token = extractTokenFromReq(req);
  const payload = verifyToken(token);

  if (!payload || payload.role !== "master") {
    return res.status(401).json({ error: "Acceso solo para master" });
  }

  req.auth = payload;
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractTokenFromReq,
  authenticateAny,
  authenticateMaster,
};
