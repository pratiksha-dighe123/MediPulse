import {
	getAllDoctorsService,
	getDoctorByIdService,
	getDoctorsForBookingService,
	createDoctorService,
	updateDoctorService,
	deleteDoctorService,
	approveDoctorService,
	rejectDoctorService,
	getDoctorsByHospitalService,
	getPendingDoctorsService,
	getDoctorStatisticsService,
} from "../services/doctorService.js";
import { broadcastDoctorAvailabilityChange } from "../services/realtimeService.js";

const getAllDoctorsController = async (req, res) => {
	try {
		const doctors = await getAllDoctorsService(req.userRole, req.userId);
		return res.status(200).json(doctors);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const getDoctorByIdController = async (req, res) => {
	const { id } = req.params;

	try {
		const doctor = await getDoctorByIdService(id, req.userRole, req.userId);
		return res.status(200).json(doctor);
	} catch (error) {
		if (error.message === "Doctor not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const getDoctorsForBookingController = async (req, res) => {
	const queryText = req.query.q || "";
	const hospitalId = req.query.hospitalId || "";

	try {
		const doctors = await getDoctorsForBookingService(queryText, hospitalId);
		return res.status(200).json(doctors);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const createDoctorController = async (req, res) => {
	try {
		const result = await createDoctorService(req.body, req.userRole, req.userId);
		return res.status(201).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const updateDoctorController = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await updateDoctorService(id, req.body, req.userRole, req.userId);
		const updatedDoctor = result?.doctor;
		
		// 📡 Emit real-time availability change notification
		if (updatedDoctor && req.body.available !== undefined) {
			broadcastDoctorAvailabilityChange(updatedDoctor._id, updatedDoctor.available, updatedDoctor.unavailableReason, {
				name: updatedDoctor.name,
				specialization: updatedDoctor.specialization,
				hospitalId: updatedDoctor.hospitalId?._id,
				hospitalName: updatedDoctor.hospitalId?.name,
			});
		}
		
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Doctor not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const deleteDoctorController = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await deleteDoctorService(id, req.userRole, req.userId);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Doctor not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

export {
	getAllDoctorsController,
	getDoctorByIdController,
	getDoctorsForBookingController,
	createDoctorController,
	updateDoctorController,
	deleteDoctorController,
};

export const approveDoctorController = async (req, res) => {
	const { id } = req.params;

	try {
		const doctor = await approveDoctorService(id, req.userRole, req.userId);
		return res.status(200).json({ message: 'Doctor approved successfully', doctor });
	} catch (error) {
		if (error.message.includes('Doctor not found')) {
			return res.status(404).json({ error: error.message });
		}
		return res.status(400).json({ error: error.message });
	}
};

export const rejectDoctorController = async (req, res) => {
	const { id } = req.params;

	try {
		const doctor = await rejectDoctorService(id, req.userRole, req.userId);
		return res.status(200).json({ message: 'Doctor rejected', doctor });
	} catch (error) {
		if (error.message.includes('Doctor not found')) {
			return res.status(404).json({ error: error.message });
		}
		return res.status(400).json({ error: error.message });
	}
};

export const listDoctorsByHospitalController = async (req, res) => {
	const { hospitalId } = req.params;
	const { status } = req.query;

	try {
		const doctors = await getDoctorsByHospitalService(hospitalId, status);
		return res.status(200).json(doctors);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

export const listPendingDoctorsController = async (req, res) => {
	const requestedHospitalId = req.query.hospitalId;
	const hospitalId = req.userRole === 'hospital' ? req.userId : requestedHospitalId;

	try {
		const doctors = await getPendingDoctorsService(hospitalId);
		return res.status(200).json(doctors);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

export const getDoctorStatisticsController = async (req, res) => {
	const { hospitalId } = req.query;

	try {
		const stats = await getDoctorStatisticsService(hospitalId);
		return res.status(200).json(stats);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};
