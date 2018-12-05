import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true }, // student ID
    username: { type: String, unique: true },
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
    updatedBy: Number
  },
  {
    collection: "users"
  }
);

export default mongoose.model("User", userSchema);
