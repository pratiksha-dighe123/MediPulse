import mongoose from "mongoose";

const { Schema, model } = mongoose;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

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

const ambulanceSchema = new Schema(
	{
		vehicleNumber: {
			type: String,
			required: true,
			trim: true,
			uppercase: true,
			unique: true,
		},
		driverName: {
			type: String,
			required: true,
			trim: true,
		},
		driverPhone: {
			type: String,
			required: true,
			trim: true,
		},
		driverEmail: {
			type: String,
			trim: true,
			lowercase: true,
			unique: true,
			sparse: true,
		},
		password: {
			type: String,
			select: false,
		},
		driverBloodGroup: {
			type: String,
			enum: BLOOD_GROUPS,
			required: true,
			trim: true,
		},
		address: {
			type: String,
			default: "",
			trim: true,
		},
		hospitalId: {
			type: Schema.Types.ObjectId,
			ref: "Hospital",
			required: true,
			index: true,
		},
		location: {
			type: pointSchema,
			required: true,
		},
		status: {
			type: String,
			enum: ["AVAILABLE", "BUSY", "OFFLINE"],
			default: "AVAILABLE",
			index: true,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
	}
);

ambulanceSchema.index({ location: "2dsphere" });

const Ambulance = model("Ambulance", ambulanceSchema);

export default Ambulance;
