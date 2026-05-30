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
			validate: {
				validator(value) {
					return !value || (Array.isArray(value) && value.length === 2);
				},
				message: "Patient geoLocation coordinates must be [lng, lat]",
			},
		},
	},
	{ _id: false }
);

const patientSchema = new Schema(
	{
		name: {
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
		age: {
			type: Number,
			required: true,
		},
		contactNumber: {
			type: String,
			required: true,
			trim: true,
		},
		bloodGroup: {
			type: String,
			enum: BLOOD_GROUPS,
			required: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			enum: ["patient"],
			default: "patient",
		},
		hospitalId: {
			type: Schema.Types.ObjectId,
			ref: "Hospital",
			default: null,
		},
		geoLocation: {
			type: pointSchema,
			default: null,
		},
		address: {
			type: String,
			required: true,
			trim: true,
		},
		buildingAddress: {
			type: String,
			required: true,
			trim: true,
		},
		laneAddress: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

patientSchema.index({ geoLocation: "2dsphere" });

const Patient = model("Patient", patientSchema);

export default Patient;