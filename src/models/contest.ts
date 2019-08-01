import * as mongoose from "mongoose";
import Counter from "./counter";

export interface IContestModel extends mongoose.Document {
  id: number;
  name: string;
  alias: string;
  available: boolean;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

/**
 * Contest schema
 */
const contestSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    alias: { type: String, required: true },
    available: { type: Boolean, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: Number,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: Number
  },
  {
    collection: "contests"
  }
);

/**
 * Enable auto-increment
 * DO NOT USE ARROW FUNCTION HERE
 * Problem of `this` scope
 */
contestSchema.pre("save", function(next) {
  Counter.findByIdAndUpdate(
    "contest",
    { $inc: { count: 1 } },
    { new: true, upsert: true },
    (err, counter: any) => {
      if (err) {
        return next(err);
      }
      this.id = counter.count;
      next();
    }
  );
});

export default mongoose.model<IContestModel>("Contest", contestSchema);
