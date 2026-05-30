import Ambulance from "../models/ambulanceModel.js";
import bcrypt from "bcrypt";

const toPoint = (lng, lat) => {
	const parsedLng = Number(lng);
	const parsedLat = Number(lat);

	if (!Number.isFinite(parsedLng) || !Number.isFinite(parsedLat)) {
		throw new Error("Invalid coordinates");
	}

	return {
		type: "Point",
		coordinates: [parsedLng, parsedLat],
	};
};

const createAmbulanceService = async (payload) => {
	const { lng, lat, password, ...rest } = payload || {};

	if (!rest?.driverBloodGroup) {
		throw new Error("driverBloodGroup is required");
	}

	if (!rest?.driverEmail) {
		throw new Error("driverEmail is required");
	}

	if (!password) {
		throw new Error("password is required");
	}

	const normalizedEmail = String(rest.driverEmail).trim().toLowerCase();
	const existingWithEmail = await Ambulance.findOne({ driverEmail: normalizedEmail });
	if (existingWithEmail) {
		throw new Error("driverEmail already in use");
	}

	const ambulance = await Ambulance.create({
		...rest,
		driverEmail: normalizedEmail,
		password: await bcrypt.hash(String(password), 10),
		location: toPoint(lng, lat),
	});

	return { message: "Ambulance created successfully", ambulance };
};

const getAllAmbulancesService = async () => {
	const ambulances = await Ambulance.find()
		.sort({ createdAt: -1 })
		.populate({
			path: "hospitalId",
			select: "name email",
		});
	return ambulances;
};

const getPublicAmbulancesService = async () => {
	const ambulances = await Ambulance.find()
		.sort({ createdAt: -1 })
		.populate({
			path: "hospitalId",
			select: "name address.city address.state",
		});

	return ambulances;
};

const getAmbulanceByIdService = async (id) => {
	const ambulance = await Ambulance.findById(id);

	if (!ambulance) {
		throw new Error("Ambulance not found");
	}

	return ambulance;
};

const getMyAmbulanceProfileService = async (actorId) => {
	if (!actorId) {
		throw new Error("Ambulance not found");
	}

	const ambulance = await Ambulance.findById(actorId).populate({
		path: "hospitalId",
		select: "name email phone address",
	});

	if (!ambulance) {
		throw new Error("Ambulance not found");
	}

	return ambulance;
};

const updateAmbulanceService = async (id, payload) => {
	const updates = { ...payload };

	if (Object.prototype.hasOwnProperty.call(payload || {}, "lng") || Object.prototype.hasOwnProperty.call(payload || {}, "lat")) {
		updates.location = toPoint(payload?.lng, payload?.lat);
		delete updates.lng;
		delete updates.lat;
	}

	const ambulance = await Ambulance.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

	if (!ambulance) {
		throw new Error("Ambulance not found");
	}

	return { message: "Ambulance updated successfully", ambulance };
};

const deleteAmbulanceService = async (id) => {
	const ambulance = await Ambulance.findByIdAndDelete(id);

	if (!ambulance) {
		throw new Error("Ambulance not found");
	}

	return { message: "Ambulance deleted successfully" };
};

const updateAmbulanceLocationService = async (id, lng, lat) => {
	const ambulance = await Ambulance.findByIdAndUpdate(
		id,
		{ location: toPoint(lng, lat) },
		{ new: true, runValidators: true }
	);

	if (!ambulance) {
		throw new Error("Ambulance not found");
	}

	return { message: "Ambulance location updated", ambulance };
};

const updateAmbulanceStatusService = async (id, status) => {
	const ambulance = await Ambulance.findByIdAndUpdate(
		id,
		{ status },
		{ new: true, runValidators: true }
	);

	if (!ambulance) {
		throw new Error("Ambulance not found");
	}

	return { message: "Ambulance status updated", ambulance };
};

const getNearbyAmbulancesService = async ({ lng, lat, radius = 5000 }) => {
	const nearPoint = {
		type: "Point",
		coordinates: [Number(lng), Number(lat)],
	};

	if (!Number.isFinite(nearPoint.coordinates[0]) || !Number.isFinite(nearPoint.coordinates[1])) {
		throw new Error("Invalid coordinates");
	}

	const maxDistance = Number(radius);
	if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
		throw new Error("Invalid radius");
	}

	const ambulances = await Ambulance.aggregate([
		{
			$geoNear: {
				near: nearPoint,
				distanceField: "distanceInMeters",
				spherical: true,
				maxDistance,
				query: { status: "AVAILABLE", isActive: true },
			},
		},
	]);

	return ambulances;
};

export {
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
};
