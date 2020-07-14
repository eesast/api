import mongoose from "mongoose";

export interface EmailModel extends mongoose.Document {
  email: string;
}

const emailSchema = new mongoose.Schema<EmailModel>(
  {
    email: { type: String, required: true, unique: true },
  },
  {
    collection: "emails",
  }
);

export default mongoose.model<EmailModel>("Email", emailSchema);
