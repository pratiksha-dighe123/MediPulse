import mongoose from "mongoose";

const { Schema, model } = mongoose;

const dispatchAttemptSchema = new Schema(
  {
    sourceType: {
      type: String,
      enum: ["BLOOD_BANK", "DONOR"],
      required: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["NO_STOCK", "NO_RESPONSE", "REJECTED", "ACCEPTED", "FAILED"],
      required: true,
    },
    distanceInMeters: {
      type: Number,
      default: null,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const emergencyDispatchLogSchema = new Schema(
  {
    bloodRequestId: {
      type: Schema.Types.ObjectId,
      ref: "BloodRequest",
      required: true,
      index: true,
    },
    attempts: {
      type: [dispatchAttemptSchema],
      default: [],
    },
    finalResolution: {
      type: String,
      enum: ["PENDING", "FULFILLED_BY_BLOOD_BANK", "FULFILLED_BY_DONOR", "FAILED"],
      default: "PENDING",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const EmergencyDispatchLog = model("EmergencyDispatchLog", emergencyDispatchLogSchema);

export default EmergencyDispatchLog;