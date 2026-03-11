const mongoose = require("mongoose");

const CampaignInfoSchema = new mongoose.Schema(
  {
    campaign: {
      type: String,
      default: "default",
      index: true,
    },

    info: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CampaignInfo", CampaignInfoSchema);