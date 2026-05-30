import mongoose from "mongoose";

const visitorCounterSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      default: "portfolio",
    },
    visitorCount: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("VisitorCounter", visitorCounterSchema);
