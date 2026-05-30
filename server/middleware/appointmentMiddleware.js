const validateAppointmentPayload = (req, res, next) => {
	const { patientId, doctorId, appointmentDate, appointmentTime } = req.body;
	const role = req.userRole || req.user?.role;

	const missingFields = [];

	if (!appointmentDate) {
		missingFields.push("appointmentDate");
	}

	if (!appointmentTime) {
		missingFields.push("appointmentTime");
	}

	if (role === "patient") {
		if (!doctorId) {
			missingFields.push("doctorId");
		}
	} else if (role === "doctor") {
		if (!patientId) {
			missingFields.push("patientId");
		}
	} else {
		if (!patientId) {
			missingFields.push("patientId");
		}

		if (!doctorId) {
			missingFields.push("doctorId");
		}
	}

	if (missingFields.length > 0) {
		return res.status(400).json({
			error: `Missing required appointment fields: ${missingFields.join(", ")}`,
		});
	}

	return next();
};

const validateAppointmentUpdatePayload = (req, res, next) => {
	if (!req.body || Object.keys(req.body).length === 0) {
		return res.status(400).json({ error: "Update payload is required" });
	}

	return next();
};

export { validateAppointmentPayload, validateAppointmentUpdatePayload };
