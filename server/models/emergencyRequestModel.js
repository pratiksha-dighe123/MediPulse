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

const emergencyRequestSchema = new Schema(
	{
		patientId: {
			type: Schema.Types.ObjectId,
			ref: "Patient",
			required: true,
			index: true,
		},
		location: {
			type: pointSchema,
			required: true,
		},
		ambulanceId: {
			type: Schema.Types.ObjectId,
			ref: "Ambulance",
			default: null,
			index: true,
		},
		hospitalId: {
			type: Schema.Types.ObjectId,
			ref: "Hospital",
			default: null,
			index: true,
		},
		doctorId: {
			type: Schema.Types.ObjectId,
			ref: "Doctor",
			default: null,
			index: true,
		},
		patientSnapshot: {
			name: {
				type: String,
				default: "",
				trim: true,
			},
			bloodGroup: {
				type: String,
				default: "",
				trim: true,
			},
			contactNumber: {
				type: String,
				default: "",
				trim: true,
			},
			address: {
				type: String,
				default: "",
				trim: true,
			},
		},
		status: {
			type: String,
			enum: ["PENDING", "ACCEPTED", "COMPLETED", "CANCELLED"],
			default: "PENDING",
			index: true,
		},
		hiddenForPatient: {
			type: Boolean,
			default: false,
		},
		hiddenForHospital: {
			type: Boolean,
			default: false,
		},
		hiddenForDriver: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
);

emergencyRequestSchema.index({ location: "2dsphere" });

const EmergencyRequest = model("EmergencyRequest", emergencyRequestSchema);

export default EmergencyRequest;
