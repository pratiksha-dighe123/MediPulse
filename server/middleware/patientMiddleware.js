const validatePatientPayload = (req, res, next) => {
	const { name, email, age, contactNumber, password, bloodGroup, buildingAddress, laneAddress, lng, lat } = req.body;

	if (!name || !email || !age || !contactNumber || !password || !bloodGroup || !buildingAddress || !laneAddress) {
		return res.status(400).json({ error: "Missing required patient fields" });
	}

	if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) {
		return res.status(400).json({ error: "Patient location must include valid lng and lat" });
	}

	return next();
};

const validatePatientUpdatePayload = (req, res, next) => {
	if (!req.body || Object.keys(req.body).length === 0) {
		return res.status(400).json({ error: "Update payload is required" });
	}

	return next();
};

export { validatePatientPayload, validatePatientUpdatePayload };
