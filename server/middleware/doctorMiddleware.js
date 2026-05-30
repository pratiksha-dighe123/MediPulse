const validateDoctorPayload = (req, res, next) => {
	const {
		name,
		email,
		age,
		contactNumber,
		hospitalId,
		licenseNumber,
		password,
		specialization,
		experience,
		homeAddress,
		bloodGroup,
		buildingAddress,
		laneAddress,
		lng,
		lat,
	} = req.body;

	const requiresHospitalId = req.userRole !== "hospital";

	if (!name || !email || !age || !contactNumber || (requiresHospitalId && !hospitalId) || !licenseNumber || !password || !specialization || !experience || !homeAddress || !bloodGroup || !buildingAddress || !laneAddress) {
		return res.status(400).json({ error: "Missing required doctor fields" });
	}

	if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) {
		return res.status(400).json({ error: "Doctor home location must include valid lng and lat" });
	}

	return next();
};

const validateDoctorUpdatePayload = (req, res, next) => {
	if (!req.body || Object.keys(req.body).length === 0) {
		return res.status(400).json({ error: "Update payload is required" });
	}

	return next();
};

export { validateDoctorPayload, validateDoctorUpdatePayload };
