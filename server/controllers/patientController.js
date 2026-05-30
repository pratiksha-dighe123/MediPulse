import {
	getAllPatientsService,
	getPatientByIdService,
	createPatientService,
	updatePatientService,
	deletePatientService,
	getNearbySupportForPatientService,
} from "../services/patientService.js";

const getAllPatientsController = async (req, res) => {
	try {
		const patients = await getAllPatientsService(req.userRole, req.userId);
		return res.status(200).json(patients);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const getPatientByIdController = async (req, res) => {
	const { id } = req.params;

	try {
		const patient = await getPatientByIdService(id, req.userRole, req.userId);
		return res.status(200).json(patient);
	} catch (error) {
		if (error.message.includes("Patient not found")) {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const createPatientController = async (req, res) => {
	try {
		const result = await createPatientService(req.body, req.userRole, req.userId);
		return res.status(201).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const updatePatientController = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await updatePatientService(id, req.body, req.userRole, req.userId);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message.includes("Patient not found")) {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const deletePatientController = async (req, res) => {
	const { id } = req.params;

	try {
		const result = await deletePatientService(id, req.userRole, req.userId);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message.includes("Patient not found")) {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const getNearbySupportForPatientController = async (req, res) => {
	try {
		const radius = req.query.radius || 10000;
		const result = await getNearbySupportForPatientService(req.userId, radius);
		return res.status(200).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

export {
	getAllPatientsController,
	getPatientByIdController,
	createPatientController,
	updatePatientController,
	deletePatientController,
	getNearbySupportForPatientController,
};
