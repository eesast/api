import * as mongoose from "mongoose";

export interface ICounterModel extends mongoose.Document {
  _id: string;
  count: number;
}

/**
 * Counter schema
 * Used for auto-increment id
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

export default mongoose.model<ICounterModel>("Counter", counterSchema);
