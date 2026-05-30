import {
	getAllAppointmentsService,
	getAppointmentByIdService,
	getMyAppointmentsService,
	createAppointmentService,
	updateAppointmentService,
	deleteAppointmentService,
	recordAppointmentPaymentService,
	createAppointmentRazorpayOrderService,
	verifyAppointmentRazorpayPaymentService,
} from "../services/appointmentService.js";
import { sendAppointmentReminderByIdService } from "../services/reminderService.js";
import {
	broadcastAppointmentStatusChange,
	notifyDoctorNewAppointment,
	notifyPatientAppointmentUpdate,
} from "../services/realtimeService.js";

const getAllAppointmentsController = async (req, res) => {
	try {
		const appointments = await getAllAppointmentsService();
		return res.status(200).json(appointments);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const getAppointmentByIdController = async (req, res) => {
	const { id } = req.params;

	try {
		const appointment = await getAppointmentByIdService(id);
		return res.status(200).json(appointment);
	} catch (error) {
		if (error.message === "Appointment not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const getMyAppointmentsController = async (req, res) => {
	try {
		const appointments = await getMyAppointmentsService(req.userId, req.userRole);
		return res.status(200).json(appointments);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const createAppointmentController = async (req, res) => {
	const appointmentData = { ...req.body };

	if (req.userRole === "patient") {
		appointmentData.patientId = req.userId;
	}

	if (req.userRole === "doctor") {
		appointmentData.doctorId = req.userId;
	}

	try {
		const result = await createAppointmentService(appointmentData);
		const createdAppointment = result?.appointment;

		// 📡 Emit real-time notification to doctor
		if (createdAppointment?._id && createdAppointment?.doctorId?._id) {
			notifyDoctorNewAppointment(createdAppointment.doctorId._id, createdAppointment);
		}

		return res.status(201).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const updateAppointmentController = async (req, res) => {
	const { id } = req.params;
	const appointmentData = { ...req.body };

	if (req.userRole === "doctor" && appointmentData.status === "completed" && !appointmentData.visitedAt) {
		appointmentData.visitedAt = new Date();
	}

	try {
		const result = await updateAppointmentService(id, appointmentData, req.userId, req.userRole);
		const updatedAppointment = result?.appointment;

		// 📡 Emit real-time status change notification
		if (updatedAppointment?._id && appointmentData.status) {
			broadcastAppointmentStatusChange(updatedAppointment._id, updatedAppointment.status, {
				patientId: updatedAppointment.patientId,
				doctorId: updatedAppointment.doctorId,
				hospitalId: updatedAppointment.doctorId?.hospitalId,
				appointmentDate: updatedAppointment.appointmentDate,
				patientName: updatedAppointment.patientId?.name,
				doctorName: updatedAppointment.doctorId?.name,
				hospitalName: updatedAppointment.doctorId?.hospitalId?.name,
			});

			// Also notify patient of updates
			notifyPatientAppointmentUpdate(updatedAppointment.patientId?._id, updatedAppointment);
		}

		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Appointment not found or access denied") {
			return res.status(404).json({ error: error.message });
		}

		if (error.message === "Not authorized to update this appointment") {
			return res.status(403).json({ error: error.message });
		}

		if (error.message === "Payment must be completed before saving diagnosis/prescription") {
			return res.status(400).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const recordAppointmentPaymentController = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await recordAppointmentPaymentService(id, req.body, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Appointment not found or access denied") {
			return res.status(404).json({ error: error.message });
		}

		if (error.message === "Not authorized to record payment") {
			return res.status(403).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const createAppointmentRazorpayOrderController = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await createAppointmentRazorpayOrderService(id, req.body, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Appointment not found or access denied") {
			return res.status(404).json({ error: error.message });
		}

		if (error.message === "Not authorized to record payment") {
			return res.status(403).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const verifyAppointmentRazorpayPaymentController = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await verifyAppointmentRazorpayPaymentService(id, req.body, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Appointment not found or access denied") {
			return res.status(404).json({ error: error.message });
		}

		if (error.message === "Not authorized to record payment") {
			return res.status(403).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const sendAppointmentReminderController = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await sendAppointmentReminderByIdService(id, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Appointment not found or access denied") {
			return res.status(404).json({ error: error.message });
		}

		if (error.message === "Not authorized to send reminders") {
			return res.status(403).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const deleteAppointmentController = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await deleteAppointmentService(id, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Appointment not found") {
			return res.status(404).json({ error: error.message });
		}

		if (error.message === "Not authorized to delete this appointment") {
			return res.status(403).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

export {
	getAllAppointmentsController,
	getAppointmentByIdController,
	getMyAppointmentsController,
	createAppointmentController,
	updateAppointmentController,
	deleteAppointmentController,
	recordAppointmentPaymentController,
	createAppointmentRazorpayOrderController,
	verifyAppointmentRazorpayPaymentController,
	sendAppointmentReminderController,
};
