import mongoose from "mongoose";

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

const ambulanceTrackingSchema = new Schema(
	{
		ambulanceId: {
			type: Schema.Types.ObjectId,
			ref: "Ambulance",
			required: true,
			index: true,
		},
		location: {
			type: pointSchema,
			required: true,
		},
		timestamp: {
			type: Date,
			default: Date.now,
			index: true,
		},
	},
	{
		timestamps: false,
	}
);

ambulanceTrackingSchema.index({ location: "2dsphere" });

const AmbulanceTracking = model("AmbulanceTracking", ambulanceTrackingSchema);

export default AmbulanceTracking;
