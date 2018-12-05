import mongoose from "mongoose";

/**
 * Used for auto increment id
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0 }
  },
  {
    collection: "counters"
  }
);

export default mongoose.model("Counter", counterSchema);
