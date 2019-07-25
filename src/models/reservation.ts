import * as mongoose from "mongoose";
import Counter from "./counter";

export interface IReservationModel extends mongoose.Document {
  id: number;
  itemId: number;
  userId: number;
  from: Date;
  to: Date;
  reason?: string;
  approved: boolean;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
  available: boolean;
}

/**
 * Reservation schema
 */
const reservationSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true }, // use auto-increment id, instead of _id generated by database
    itemId: { type: Number, required: true },
    userId: { type: Number, required: true }, // reservation's applicant's id
    from: { type: Date, required: true }, // ISO Date
    to: { type: Date, required: true }, // ISO Date
    reason: String,
    approved: { type: Boolean, default: false }, // used for review
    createdAt: { type: Date, default: Date.now },
    createdBy: Number,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: Number,
    available: { type: Boolean, default: true }
  },
  {
    collection: "reservations"
  }
);

/**
 * Enable auto-increment
 * DO NOT USE ARROW FUNCTION HERE
 * Problem of `this` scope
 */
reservationSchema.pre("save", function(next) {
  Counter.findByIdAndUpdate(
    "reservation",
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
const Reservation = mongoose.model<IReservationModel>(
  "Reservation",
  reservationSchema
);

Reservation.updateMany(
  { available: { $exists: false } },
  { $set: { available: true } },
  (err, data) => {
    if (err) console.log(err);
    if (data.nModified) console.log("reservation", data);
  }
);

export default Reservation;
