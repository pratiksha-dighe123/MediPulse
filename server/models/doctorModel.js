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
				message: "Doctor homeLocation coordinates must be [lng, lat]",
			},
		},
	},
	{ _id: false }
);

const doctorSchema = new Schema(
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
		contact: {
			type: String,
			required: true,
			trim: true,
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
			select: false,
		},
		role: {
			type: String,
			enum: ["doctor"],
			default: "doctor",
		},
		specialization: {
			type: String,
			required: true,
			trim: true,
		},
		experience: {
			type: Number,
			required: true,
		},
		timeSlots: {
			availableTimeSlots: {
				type: [String],
				default: [],
			},
			bookedTimeSlots: {
				type: [String],
				default: [],
			},
		},
		address: {
			type: String,
			required: true,
			trim: true,
		},
		homeAddress: {
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
		homeLocation: {
			type: pointSchema,
			default: null,
		},
		hospitalId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Hospital',
			required: true,
		},
		licenseNumber: {
			type: String,
			required: true,
			unique: true,
		},
		approvalStatus: {
			type: String,
			enum: ['pending', 'approved', 'rejected'],
			default: 'pending',
		},
		isApproved: {
			type: Boolean,
			default: false,
		},
		available: {
			type: Boolean,
			default: true,
		},
		activeHours: {
			start: {
				type: String,
				default: "09:00",
				trim: true,
			},
			end: {
				type: String,
				default: "17:00",
				trim: true,
			},
		},
		unavailableReason: {
			type: String,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

doctorSchema.index({ homeLocation: "2dsphere" });

const Doctor = model("Doctor", doctorSchema);

export default Doctor;