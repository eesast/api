import mongoose from "mongoose";
import Counter from "./counter";

export interface TrackModel extends mongoose.Document {
  id: number;
  name: string;
  year: number;
  player: [number];
  description: string;
  open: boolean;
}

const trackSchema = new mongoose.Schema<TrackModel>(
  {
    id: { type: Number, unique: true },
    name: { type: String },
    year: { type: Number },
    player: {
      type: [{ type: Number, index: true }],
      index: true,
      default: []
    },
    description: { type: String, default: "No description" },
    open: { type: Boolean, default: false }
  },
  {
    collection: "tracks"
  }
);
trackSchema.pre<TrackModel>("save", function(next) {
  Counter.findByIdAndUpdate(
    "track",
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

export default mongoose.model<TrackModel>("Track", trackSchema);
