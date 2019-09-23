import mongoose from "mongoose";
import Counter from "./counter";

export interface EnrollmentModel extends mongoose.Document {
  id: number;
  userId: number;
  contestId: number;
  enroll: boolean;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

const enrollmentSchema = new mongoose.Schema<EnrollmentModel>(
  {
    id: { type: Number, unique: true },
    userId: { type: Number, required: true },
    contestId: { type: Number, required: true },
    enroll: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    createdBy: Number,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: Number
  },
  {
    collection: "enrollments"
  }
);

enrollmentSchema.pre<EnrollmentModel>("save", function(next) {
  Counter.findByIdAndUpdate(
    "enrollment",
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

export default mongoose.model<EnrollmentModel>("Enrollment", enrollmentSchema);
