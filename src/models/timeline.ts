import * as mongoose from "mongoose";
import Counter from "./counter";

export interface ITimelineModel extends mongoose.Document {
  id: number;
  alias: string;
  description: string;
  originalUri: string;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
  link?: string;
  isAlive: boolean;
}

const editableParams = ["alias", "description", "originalUri", "link"];
const timelineSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true }, // use auto-increment id, instead of _id generated by database
    title: { type: String, required: true }, // “太阳花”
    alias: { type: String, required: true, unique: true }, // for SEO and URL, “sunflower”,unique
    description: { type: String, required: true }, // description
    originalUri: { type: String, required: true }, // url to static data
    createdAt: { type: Date, default: Date.now, required: true },
    createdBy: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: Number,
    link: String,
    isAlive: { type: Boolean, default: true }
  },
  {
    collection: "timelines"
  }
);

/**
 * Enable auto-increment
 * DO NOT USE ARROW FUNCTION HERE
 * Problem of `this` scope
 */
timelineSchema.pre("save", function(next) {
  Counter.findByIdAndUpdate(
    "item",
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

export { editableParams };
export default mongoose.model<ITimelineModel>("Timeline", timelineSchema);
