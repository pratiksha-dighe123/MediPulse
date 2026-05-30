import {
	createAmbulanceService,
	getAllAmbulancesService,
	getPublicAmbulancesService,
	getAmbulanceByIdService,
	getMyAmbulanceProfileService,
	updateAmbulanceService,
	deleteAmbulanceService,
	updateAmbulanceLocationService,
	updateAmbulanceStatusService,
	getNearbyAmbulancesService,
} from "../services/ambulanceService.js";

const createAmbulanceController = async (req, res) => {
	try {
		const result = await createAmbulanceService(req.body);
		return res.status(201).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const getAllAmbulancesController = async (req, res) => {
	try {
		const result = await getAllAmbulancesService();
		return res.status(200).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const getPublicAmbulancesController = async (req, res) => {
	try {
		const result = await getPublicAmbulancesService();
		return res.status(200).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

const getAmbulanceByIdController = async (req, res) => {
	try {
		const result = await getAmbulanceByIdService(req.params.id);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Ambulance not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const getMyAmbulanceProfileController = async (req, res) => {
	try {
		const result = await getMyAmbulanceProfileService(req.userId);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Ambulance not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const updateAmbulanceController = async (req, res) => {
	try {
		const result = await updateAmbulanceService(req.params.id, req.body);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Ambulance not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const deleteAmbulanceController = async (req, res) => {
	try {
		const result = await deleteAmbulanceService(req.params.id);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Ambulance not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const updateAmbulanceLocationController = async (req, res) => {
	try {
		const result = await updateAmbulanceLocationService(req.params.id, req.body?.lng, req.body?.lat);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Ambulance not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const updateAmbulanceStatusController = async (req, res) => {
	try {
		const result = await updateAmbulanceStatusService(req.params.id, req.body?.status);
		return res.status(200).json(result);
	} catch (error) {
		if (error.message === "Ambulance not found") {
			return res.status(404).json({ error: error.message });
		}

		return res.status(400).json({ error: error.message });
	}
};

const getNearbyAmbulancesController = async (req, res) => {
	try {
		const result = await getNearbyAmbulancesService(req.query);
		return res.status(200).json(result);
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
};

export {
	createAmbulanceController,
	getAllAmbulancesController,
	getPublicAmbulancesController,
	getAmbulanceByIdController,
	getMyAmbulanceProfileController,
	updateAmbulanceController,
	deleteAmbulanceController,
	updateAmbulanceLocationController,
	updateAmbulanceStatusController,
	getNearbyAmbulancesController,
};
