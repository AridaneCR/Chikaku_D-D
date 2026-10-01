const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    passwordSalt: {
      type: String,
      required: true,
      select: false,
    },
    sessionToken: {
      type: String,
      default: null,
      index: true,
      select: false,
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
