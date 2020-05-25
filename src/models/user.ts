import mongoose from "mongoose";

export interface UserModel extends mongoose.Document {
  email: string;
  password: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

const userSchema = new mongoose.Schema<UserModel>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
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
