import mongoose from "mongoose";

const { Schema, model } = mongoose;

const appointmentSchema = new Schema(
	{
		patientId: {
			type: Schema.Types.ObjectId,
			ref: "Patient",
			required: true,
		},
		doctorId: {
			type: Schema.Types.ObjectId,
			ref: "Doctor",
			required: true,
		},
		appointmentDate: {
			type: Date,
			required: true,
		},
		appointmentTime: {
			type: String,
			required: true,
			trim: true,
		},
		status: {
			type: String,
			enum: ["scheduled", "completed", "cancelled"],
			default: "scheduled",
		},
		medicineDescription: {
			type: String,
			trim: true,
			default: "",
		},
		diagnosis: {
			type: String,
			trim: true,
			default: "",
		},
		medicalPrescription: {
			type: String,
			trim: true,
			default: "",
		},
		paymentMethod: {
			type: String,
			enum: ["cash", "online", "upi", ""],
			default: "",
		},
		paymentAmount: {
			type: Number,
			default: 0,
			min: 0,
		},
		paymentStatus: {
			type: String,
			enum: ["unpaid", "paid"],
			default: "unpaid",
		},
		paymentTransactionId: {
			type: String,
			trim: true,
			default: "",
		},
		paidAt: {
			type: Date,
			default: null,
		},
		smsReminderSentAt: {
			type: Date,
			default: null,
		},
		whatsappReminderSentAt: {
			type: Date,
			default: null,
		},
		lastReminderAttemptAt: {
			type: Date,
			default: null,
		},
		reminderLastError: {
			type: String,
			trim: true,
			default: "",
		},
		visitedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

const Appointment = model("Appointment", appointmentSchema);

export default Appointment;