import mongoose from "mongoose";
import { BLOOD_GROUPS } from "../utils/bloodUtils.js";

const { Schema, model } = mongoose;

const bloodInventorySchema = new Schema(
  {
    bloodBankId: {
      type: Schema.Types.ObjectId,
      ref: "BloodBank",
      required: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: true,
      trim: true,
      index: true,
    },
    unitsAvailable: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reservedUnits: {
      type: Number,
      default: 0,
      min: 0,
    },
    criticalThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    lastRestockedAt: {
      type: Date,
      default: null,
    },
    expiresSoonUnits: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

bloodInventorySchema.index({ bloodBankId: 1, bloodGroup: 1 }, { unique: true });
bloodInventorySchema.index({ bloodGroup: 1, unitsAvailable: -1 });

const BloodInventory = model("BloodInventory", bloodInventorySchema);

export default BloodInventory;