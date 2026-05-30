import mongoose from "mongoose";
import { BLOOD_GROUPS } from "../utils/bloodUtils.js";

const { Schema, model } = mongoose;

const pointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: "Location coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false }
);

const bloodRequestSchema = new Schema(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    requesterRole: {
      type: String,
      enum: ["patient", "doctor", "hospital", "admin"],
      required: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: true,
      trim: true,
    },
    unitsRequired: {
      type: Number,
      required: true,
      min: 1,
    },
    urgencyLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH",
      index: true,
    },
    location: {
      type: pointSchema,
      required: true,
    },
    patientSnapshot: {
      name: {
        type: String,
        trim: true,
        default: "",
      },
      age: {
        type: Number,
        default: null,
      },
      contactNumber: {
        type: String,
        trim: true,
        default: "",
      },
      diagnosisHint: {
        type: String,
        trim: true,
        default: "",
      },
    },
    status: {
      type: String,
      enum: ["PENDING", "MATCHED_BLOOD_BANK", "MATCHED_DONOR", "FULFILLED", "CANCELLED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    assignedBloodBankId: {
      type: Schema.Types.ObjectId,
      ref: "BloodBank",
      default: null,
      index: true,
    },
    assignedDonorId: {
      type: Schema.Types.ObjectId,
      ref: "Donor",
      default: null,
      index: true,
    },
    fulfilledBySource: {
      type: String,
      enum: ["NONE", "BLOOD_BANK", "DONOR"],
      default: "NONE",
      index: true,
    },
    matchedAt: {
      type: Date,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

bloodRequestSchema.index({ location: "2dsphere" });
bloodRequestSchema.index({ bloodGroup: 1, status: 1, urgencyLevel: 1 });

const BloodRequest = model("BloodRequest", bloodRequestSchema);

export default BloodRequest;
