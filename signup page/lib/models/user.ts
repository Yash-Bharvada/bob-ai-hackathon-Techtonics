import mongoose, { Schema, Document, Model } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  image?: string
  provider: string
  zone?: string
  designation?: string
  createdAt: Date
  lastLoginAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    image: { type: String },
    provider: { type: String, default: "google" },
    zone: { type: String },
    designation: { type: String },
    lastLoginAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt
  }
)

// Prevent model re-compilation during Next.js hot-reload
const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema)

export default User
