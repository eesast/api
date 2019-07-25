import * as mongoose from "mongoose";

export interface IUserModel extends mongoose.Document {
  id: number;
  username: string;
  group: string;
  role: string;
  password: string;
  email?: string;
  name?: string;
  phone?: number;
  department?: string;
  class?: string;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
  available: boolean;
}

/**
 * User schema
 */
const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true }, // user ID
    username: { type: String, unique: true }, // alphanumeric string
    group: { type: String, required: true },
    role: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, unique: true },
    name: String,
    phone: Number,
    department: String,
    class: String,
    createdAt: { type: Date, default: Date.now },
    createdBy: Number,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: Number,
    available: { type: Boolean, default: true }
  },
  {
    collection: "users"
  }
);
const User = mongoose.model<IUserModel>("User", userSchema);
User.update({ available: { $exists: false } }, { $set: { available: true } });
export default User;
