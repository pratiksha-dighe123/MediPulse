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
      validate: {
        validator(value) {
          return !value || (Array.isArray(value) && value.length === 2);
        },
        message: "Location coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false }
);

const donorSchema = new Schema(
  {
    sourceType: {
      type: String,
      enum: ["community", "patient", "doctor", "driver"],
      default: "community",
      index: true,
    },
    sourceRefId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    age: {
      type: Number,
      required: true,
      min: 18,
      max: 100,
    },
    weightKg: {
      type: Number,
      required: true,
      min: 50,
      max: 250,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: true,
      trim: true,
      index: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    alternateContactNumber: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: 220,
    },
    geoLocation: {
      type: pointSchema,
      default: null,
    },
    isEligible: {
      type: Boolean,
      default: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    availabilityStatus: {
      type: String,
      enum: ["AVAILABLE", "UNAVAILABLE", "CONTACTED", "DONATED_RECENTLY"],
      default: "AVAILABLE",
      index: true,
    },
    lastDonatedAt: {
      type: Date,
      default: null,
    },
    consentGiven: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

donorSchema.index({ geoLocation: "2dsphere" });
donorSchema.index({ bloodGroup: 1, isEligible: 1, isActive: 1, availabilityStatus: 1 });

const Donor = model("Donor", donorSchema);

export default Donor;