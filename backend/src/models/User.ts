import { model, Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    // Study minutes for each weekday, index 0 = Sunday ... 6 = Saturday. 0 means a day off.
    weekdayMinutes: {
      type: [Number],
      default: [60, 60, 60, 60, 60, 60, 60],
      validate: {
        validator: (v: number[]) => v.length === 7 && v.every((m) => m >= 0 && m <= 1440),
        message: "weekdayMinutes needs 7 values between 0 and 1440",
      },
    },
    scheduleMode: {
      type: String,
      enum: ["deadline", "interleave", "weighted"],
      default: "deadline",
    },
    timezone: { type: String, default: "UTC" },
    backlogPreference: {
      type: String,
      enum: ["ask", "spread", "increase", "extend"],
      default: "ask",
    },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
