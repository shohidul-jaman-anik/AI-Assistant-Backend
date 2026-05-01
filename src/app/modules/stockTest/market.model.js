// models/query.model.js
import mongoose from "mongoose";

const querySchema = new mongoose.Schema(
  {
    query: String,
    type: { type: String, enum: ["stock", "forex", "options", "analysis"] },
    symbol: String,
    response: Object,
    source: String,
  },
  { timestamps: true }
);

export default mongoose.model("MarketQuery", querySchema);