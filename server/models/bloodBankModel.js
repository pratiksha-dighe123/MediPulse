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

const bloodUnitSchema = new Schema(
  {
    group: {
      type: String,
      enum: BLOOD_GROUPS,
      required: true,
      trim: true,
    },
    units: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const bloodBankSchema = new Schema(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    location: {
      type: pointSchema,
      required: true,
    },
    availableBloodGroups: {
      type: [bloodUnitSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    acceptedRequestRadiusMeters: {
      type: Number,
      default: 25000,
      min: 1000,
      max: 200000,
    },
    services: {
      type: [String],
      default: [],
    },
    operatingHours: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

bloodBankSchema.index({ location: "2dsphere" });
bloodBankSchema.index({ name: 1, address: 1, contactNumber: 1 }, { unique: true });
bloodBankSchema.index({ licenseNumber: 1 }, { unique: true });

const BloodBank = model("BloodBank", bloodBankSchema);

export default BloodBank;
