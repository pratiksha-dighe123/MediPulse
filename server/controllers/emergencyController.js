import {
	createEmergencyRequestService,
	assignNearestAmbulanceService,
	acceptEmergencyService,
	completeEmergencyService,
	cancelEmergencyService,
	getNearestEmergencySupportService,
	triggerEmergencyAlertService,
	getEmergencyAlertsForRoleService,
	getEmergencyAlertByIdService,
	notifyAmbulanceDriverFromHospitalService,
	removeEmergencyAlertService,
	getLatestEmergencyForPatientService,
	hideEmergencyForDriverService,
} from "../services/emergencyService.js";

const createEmergencyController = async (req, res) => {
	try {
		const result = await createEmergencyRequestService(req.body);
		return res.status(201).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const assignEmergencyController = async (req, res) => {
	try {
		const result = await assignNearestAmbulanceService(req.params.emergencyId);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Emergency request not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const acceptEmergencyController = async (req, res) => {
	try {
		const result = await acceptEmergencyService(req.params.id, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Emergency request not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const completeEmergencyController = async (req, res) => {
	try {
		const result = await completeEmergencyService(req.params.id, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Emergency request not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const cancelEmergencyController = async (req, res) => {
	try {
		const result = await cancelEmergencyService(req.params.id, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Emergency request not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const getEmergencySupportController = async (req, res) => {
	try {
		const result = await getNearestEmergencySupportService(req.query);
		return res.status(200).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const triggerEmergencyAlertController = async (req, res) => {
	try {
		const payload = {
			...req.body,
			patientId: req.userRole === "patient" ? req.userId : req.body.patientId,
		};

		const result = await triggerEmergencyAlertService(payload);
		return res.status(201).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const getMyEmergencyAlertsController = async (req, res) => {
	try {
		const status = req.query.status || "PENDING";
		const result = await getEmergencyAlertsForRoleService(req.userId, req.userRole, status);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Role not allowed to view emergency alerts") {
			return res.status(403).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const getEmergencyAlertByIdController = async (req, res) => {
	try {
		const result = await getEmergencyAlertByIdService(req.params.id, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Emergency request not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const notifyAmbulanceDriverController = async (req, res) => {
	try {
		const result = await notifyAmbulanceDriverFromHospitalService(req.params.id, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Emergency request not found") {
			return res.status(404).json({ error: error.message });
		}

		if (error.message === "Only hospital or admin can notify ambulance driver") {
			return res.status(403).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const removeEmergencyAlertController = async (req, res) => {
	try {
		const result = await removeEmergencyAlertService(req.params.id, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Emergency request not found") {
			return res.status(404).json({ error: error.message });
		}

		if (
			error.message === "Only hospital or admin can remove emergency alert" ||
			error.message === "Only completed/cancelled alerts can be removed"
		) {
			return res.status(400).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const hideEmergencyForDriverController = async (req, res) => {
	try {
		const result = await hideEmergencyForDriverService(req.params.id, req.userId, req.userRole);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Emergency request not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const getMyLatestEmergencyController = async (req, res) => {
	try {
		if (req.userRole !== "patient") {
			return res.status(403).json({ error: "Only patient can view latest emergency" });
		}

		const result = await getLatestEmergencyForPatientService(req.userId);
		return res.status(200).json(result || null);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

export {
	createEmergencyController,
	assignEmergencyController,
	acceptEmergencyController,
	completeEmergencyController,
	cancelEmergencyController,
	getEmergencySupportController,
	triggerEmergencyAlertController,
	getMyEmergencyAlertsController,
	getMyLatestEmergencyController,
	getEmergencyAlertByIdController,
	notifyAmbulanceDriverController,
	removeEmergencyAlertController,
	hideEmergencyForDriverController,
};
