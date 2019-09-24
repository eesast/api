import mongoose from "mongoose";
import Counter from "./counter";

export interface AppointmentModel extends mongoose.Document {
  id: number;
  contestId: number;
  date: Date;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

const appointmentSchema = new mongoose.Schema<AppointmentModel>(
  {
    id: { type: Number, unique: true },
    contestId: { type: Number, required: true },
    date: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: Number,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: Number
  },
  {
    collection: "appointments"
  }
);

appointmentSchema.pre<AppointmentModel>("save", function(next) {
  Counter.findByIdAndUpdate(
    "appointment",
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

export default mongoose.model<AppointmentModel>(
  "Appointment",
  appointmentSchema
);
