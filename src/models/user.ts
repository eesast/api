import mongoose from "mongoose";

export interface UserModel extends mongoose.Document {
  id: number;
  password: string;
  role: string;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

const userSchema = new mongoose.Schema<UserModel>(
  {
    id: { type: Number, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: Number,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: Number,
  },
  {
    collection: "users",
  }
);

export default mongoose.model<UserModel>("User", userSchema);
