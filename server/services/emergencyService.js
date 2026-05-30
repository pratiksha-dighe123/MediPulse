import Ambulance from "../models/ambulanceModel.js";
import EmergencyRequest from "../models/emergencyRequestModel.js";
import Hospital from "../models/hospitalModel.js";
import Doctor from "../models/doctorModel.js";
import Patient from "../models/patientModel.js";
import { broadcastEmergencyAlert, broadcastEmergencyStatusUpdate } from "./realtimeService.js";
import { sendSmsReminder } from "../utils/reminderMessaging.js";

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

const getPatientSnapshot = async (patientId) => {
	const patient = await Patient.findById(patientId).select("name bloodGroup contactNumber address buildingAddress laneAddress geoLocation");
	if (!patient) {
		throw new Error("Patient not found");
	}

	return {
		patient,
		snapshot: {
			name: patient.name || "",
			bloodGroup: patient.bloodGroup || "",
			contactNumber: patient.contactNumber || "",
			address: [patient.buildingAddress, patient.laneAddress, patient.address].filter(Boolean).join(", ") || patient.address || "",
		},
	};
};

const createEmergencyRequestService = async ({ patientId, lng, lat }) => {
	if (!patientId) {
		throw new Error("patientId is required");
	}

	const request = await EmergencyRequest.create({
		patientId,
		location: toPoint(lng, lat),
	});

	return { message: "Emergency created", emergency: request };
};

const assignNearestAmbulanceService = async (emergencyId) => {
	const emergency = await EmergencyRequest.findById(emergencyId);
	if (!emergency) {
		throw new Error("Emergency request not found");
	}

	if (emergency.status === "COMPLETED" || emergency.status === "CANCELLED") {
		throw new Error("Cannot assign ambulance for closed emergency request");
	}

	const nearestAmbulance = await Ambulance.findOne({
		status: "AVAILABLE",
		isActive: true,
		location: {
			$near: {
				$geometry: emergency.location,
			},
		},
	});

	if (!nearestAmbulance) {
		throw new Error("No available ambulance found");
	}

	emergency.ambulanceId = nearestAmbulance._id;
	emergency.hospitalId = nearestAmbulance.hospitalId;
	await emergency.save();

	nearestAmbulance.status = "BUSY";
	await nearestAmbulance.save();

	broadcastEmergencyStatusUpdate({
		emergencyId: emergency._id,
		status: emergency.status,
		patientId: emergency.patientId,
		hospitalId: emergency.hospitalId,
		doctorId: emergency.doctorId,
		ambulanceId: nearestAmbulance._id,
		ambulance: {
			vehicleNumber: nearestAmbulance.vehicleNumber,
			driverName: nearestAmbulance.driverName,
			driverPhone: nearestAmbulance.driverPhone,
		},
	});

	return {
		message: "Nearest ambulance assigned",
		emergency,
		ambulance: nearestAmbulance,
	};
};

const acceptEmergencyService = async (id, actorId, actorRole) => {
	const emergency = await EmergencyRequest.findById(id);

	if (!emergency) {
		throw new Error("Emergency request not found");
	}

	if (actorRole === "driver" && String(emergency.ambulanceId || "") !== String(actorId)) {
		throw new Error("Emergency request not found");
	}

	if (["COMPLETED", "CANCELLED"].includes(emergency.status)) {
		throw new Error("Cannot accept a closed emergency request");
	}

	emergency.status = "ACCEPTED";
	emergency.hiddenForDriver = false;
	await emergency.save();

	broadcastEmergencyStatusUpdate({
		emergencyId: emergency._id,
		status: emergency.status,
		patientId: emergency.patientId,
		hospitalId: emergency.hospitalId,
		doctorId: emergency.doctorId,
		ambulanceId: emergency.ambulanceId,
	});

	return { message: "Emergency accepted", emergency };
};

const completeEmergencyService = async (id, actorId, actorRole) => {
	const emergency = await EmergencyRequest.findById(id);
	if (!emergency) {
		throw new Error("Emergency request not found");
	}

	if (actorRole === "driver" && String(emergency.ambulanceId || "") !== String(actorId)) {
		throw new Error("Emergency request not found");
	}

	if (actorRole === "hospital" && String(emergency.hospitalId || "") !== String(actorId)) {
		throw new Error("Emergency request not found");
	}

	emergency.status = "COMPLETED";
	emergency.hiddenForDriver = actorRole === "driver";
	emergency.hiddenForHospital = true;
	emergency.hiddenForPatient = true;
	await emergency.save();

	if (emergency.ambulanceId) {
		await Ambulance.findByIdAndUpdate(emergency.ambulanceId, { status: "AVAILABLE" });
	}

	broadcastEmergencyStatusUpdate({
		emergencyId: emergency._id,
		status: emergency.status,
		patientId: emergency.patientId,
		hospitalId: emergency.hospitalId,
		doctorId: emergency.doctorId,
		ambulanceId: emergency.ambulanceId,
	});

	return { message: "Emergency completed", emergency };
};

const cancelEmergencyService = async (id, actorId, actorRole) => {
	const emergency = await EmergencyRequest.findById(id);
	if (!emergency) {
		throw new Error("Emergency request not found");
	}

	if (actorRole === "patient" && String(emergency.patientId || "") !== String(actorId)) {
		throw new Error("Emergency request not found");
	}

	if (actorRole === "hospital" && String(emergency.hospitalId || "") !== String(actorId)) {
		throw new Error("Emergency request not found");
	}

	emergency.status = "CANCELLED";
	emergency.hiddenForDriver = false;
	emergency.hiddenForHospital = true;
	emergency.hiddenForPatient = true;
	await emergency.save();

	if (emergency.ambulanceId) {
		await Ambulance.findByIdAndUpdate(emergency.ambulanceId, { status: "AVAILABLE" });
	}

	broadcastEmergencyStatusUpdate({
		emergencyId: emergency._id,
		status: emergency.status,
		patientId: emergency.patientId,
		hospitalId: emergency.hospitalId,
		doctorId: emergency.doctorId,
		ambulanceId: emergency.ambulanceId,
	});

	return { message: "Emergency cancelled", emergency };
};

const getNearestEmergencySupportService = async ({ lng, lat, radius = 10000 }) => {
	const center = toPoint(lng, lat);
	const maxDistance = Number(radius);

	if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
		throw new Error("Invalid radius");
	}

	const nearestHospital = await Hospital.findOne({
		status: "approved",
		location: {
			$near: {
				$geometry: center,
				$maxDistance: maxDistance,
			},
		},
	}).select("name phone location address");

	const nearestAmbulance = await Ambulance.findOne({
		status: "AVAILABLE",
		isActive: true,
		location: {
			$near: {
				$geometry: center,
				$maxDistance: maxDistance,
			},
		},
	}).select("vehicleNumber driverName driverPhone hospitalId location status");

	let nearestDoctor = await Doctor.findOne({
		isApproved: true,
		available: true,
		homeLocation: {
			$near: {
				$geometry: center,
				$maxDistance: maxDistance,
			},
		},
	})
		.select("name specialization contactNumber homeAddress homeLocation hospitalId")
		.populate("hospitalId", "name");

	if (!nearestDoctor && nearestHospital?._id) {
		nearestDoctor = await Doctor.findOne({
			isApproved: true,
			available: true,
			hospitalId: nearestHospital._id,
		})
			.select("name specialization contactNumber homeAddress homeLocation hospitalId")
			.populate("hospitalId", "name");
	}

	return {
		inputLocation: center,
		nearestHospital,
		nearestAmbulance,
		nearestDoctor,
	};
};

const triggerEmergencyAlertService = async ({ patientId, lng, lat, liveAddress, radius = 10000 }) => {
	if (!patientId) {
		throw new Error("patientId is required");
	}

	const { patient, snapshot } = await getPatientSnapshot(patientId);
	const liveAddressText = String(liveAddress || "").trim();
	const incidentSnapshot = {
		...snapshot,
		address: liveAddressText || snapshot.address,
	};

	const emergency = await EmergencyRequest.create({
		patientId,
		location: toPoint(lng, lat),
		patientSnapshot: incidentSnapshot,
		status: "PENDING",
	});

	let assignedAmbulance = null;
	let autoDriverSms = null;
	try {
		const assignment = await assignNearestAmbulanceService(emergency._id);
		assignedAmbulance = assignment.ambulance;

		if (assignedAmbulance?.driverPhone) {
			const patientName = incidentSnapshot?.name || patient?.name || "Patient";
			const patientPhone = incidentSnapshot?.contactNumber || patient?.contactNumber || "N/A";
			const patientAddress =
				incidentSnapshot?.address ||
				[patient?.buildingAddress, patient?.laneAddress, patient?.address].filter(Boolean).join(", ") ||
				"N/A";

			const autoSmsBody = [
				"Emergency alert assigned to your ambulance.",
				`Emergency ID: ${String(emergency._id)}`,
				`Patient: ${patientName}`,
				`Patient Phone: ${patientPhone}`,
				`Address: ${patientAddress}`,
				"Action: Call the patient now and proceed to incident location immediately.",
			].join(" ");

			autoDriverSms = await sendSmsReminder({
				to: assignedAmbulance.driverPhone,
				body: autoSmsBody,
			});
		}
	} catch {
		assignedAmbulance = null;
		autoDriverSms = null;
	}

	const support = await getNearestEmergencySupportService({ lng, lat, radius });

	emergency.hospitalId = emergency.hospitalId || support?.nearestHospital?._id || null;
	emergency.doctorId = support?.nearestDoctor?._id || null;
	if (!emergency.ambulanceId && (assignedAmbulance || support.nearestAmbulance)) {
		emergency.ambulanceId = assignedAmbulance?._id || support.nearestAmbulance?._id;
	}
	await emergency.save();

	broadcastEmergencyAlert({
		emergencyId: emergency._id,
		patientId,
		patient: incidentSnapshot,
		location: emergency.location,
		nearestHospital: support.nearestHospital,
		nearestDoctor: support.nearestDoctor,
		nearestAmbulance: assignedAmbulance || support.nearestAmbulance,
	});

	return {
		message: "Emergency alert triggered",
		emergency,
		patient: {
			id: patient._id,
			name: patient.name,
			bloodGroup: patient.bloodGroup,
			contactNumber: patient.contactNumber,
			address: incidentSnapshot.address,
		},
		support: {
			nearestHospital: support.nearestHospital,
			nearestDoctor: support.nearestDoctor,
			nearestAmbulance: assignedAmbulance || support.nearestAmbulance,
		},
		driverNotification: {
			autoSmsTriggered: Boolean(assignedAmbulance?.driverPhone),
			sms: autoDriverSms,
		},
	};
};

const getEmergencyAlertsForRoleService = async (actorId, actorRole, status = "PENDING") => {
	const query = {};

	if (status && String(status).toUpperCase() !== "ALL") {
		query.status = status;
	}

	if (actorRole === "hospital") {
		query.hospitalId = actorId;
		query.hiddenForHospital = false;
	} else if (actorRole === "doctor") {
		query.doctorId = actorId;
	} else if (actorRole === "patient") {
		query.patientId = actorId;
		query.hiddenForPatient = false;
	} else if (actorRole === "driver") {
		query.ambulanceId = actorId;
		query.hiddenForDriver = false;
	} else if (actorRole !== "admin") {
		throw new Error("Role not allowed to view emergency alerts");
	}

	const alerts = await EmergencyRequest.find(query)
		.sort({ createdAt: -1 })
		.limit(50)
		.populate("patientId", "name bloodGroup contactNumber address buildingAddress laneAddress")
		.populate("hospitalId", "name phone address")
		.populate("doctorId", "name specialization contactNumber bloodGroup homeAddress buildingAddress laneAddress")
		.populate("ambulanceId", "vehicleNumber driverName driverPhone driverBloodGroup address status");

	return alerts;
};

const getEmergencyAlertByIdService = async (id, actorId, actorRole) => {
	const emergency = await EmergencyRequest.findById(id)
		.populate("patientId", "name bloodGroup contactNumber address buildingAddress laneAddress")
		.populate("hospitalId", "name phone address")
		.populate("doctorId", "name specialization contactNumber bloodGroup homeAddress buildingAddress laneAddress")
		.populate("ambulanceId", "vehicleNumber driverName driverPhone driverBloodGroup address status");

	if (!emergency) {
		throw new Error("Emergency request not found");
	}

	if (actorRole === "admin") {
		return emergency;
	}

	const isAllowed =
		(actorRole === "patient" && String(emergency.patientId?._id || emergency.patientId) === String(actorId)) ||
		(actorRole === "hospital" && String(emergency.hospitalId?._id || emergency.hospitalId) === String(actorId)) ||
		(actorRole === "doctor" && String(emergency.doctorId?._id || emergency.doctorId) === String(actorId)) ||
		(actorRole === "driver" && String(emergency.ambulanceId?._id || emergency.ambulanceId) === String(actorId));

	if (!isAllowed) {
		throw new Error("Emergency request not found");
	}

	return emergency;
};

const getLatestEmergencyForPatientService = async (patientId) => {
	if (!patientId) {
		throw new Error("patientId is required");
	}

	const emergency = await EmergencyRequest.findOne({ patientId, hiddenForPatient: false })
		.sort({ createdAt: -1 })
		.populate("hospitalId", "name phone address")
		.populate("doctorId", "name specialization contactNumber")
		.populate("ambulanceId", "vehicleNumber driverName driverPhone driverBloodGroup status");

	return emergency;
};

const removeEmergencyAlertService = async (id, actorId, actorRole) => {
	if (!["hospital", "admin"].includes(actorRole)) {
		throw new Error("Only hospital or admin can remove emergency alert");
	}

	const emergency = await EmergencyRequest.findById(id);
	if (!emergency) {
		throw new Error("Emergency request not found");
	}

	if (actorRole === "hospital" && String(emergency.hospitalId || "") !== String(actorId)) {
		throw new Error("Emergency request not found");
	}

	if (!["COMPLETED", "CANCELLED"].includes(emergency.status)) {
		throw new Error("Only completed/cancelled alerts can be removed");
	}

	emergency.hiddenForHospital = true;
	await emergency.save();

	return { message: "Emergency alert removed" };
};

const hideEmergencyForDriverService = async (id, actorId, actorRole) => {
	if (!["driver", "admin"].includes(actorRole)) {
		throw new Error("Only driver or admin can remove emergency from driver dashboard");
	}

	const emergency = await EmergencyRequest.findById(id);
	if (!emergency) {
		throw new Error("Emergency request not found");
	}

	if (actorRole === "driver" && String(emergency.ambulanceId || "") !== String(actorId)) {
		throw new Error("Emergency request not found");
	}

	emergency.hiddenForDriver = true;
	await emergency.save();

	return { message: "Emergency removed from driver dashboard" };
};

const notifyAmbulanceDriverFromHospitalService = async (id, actorId, actorRole) => {
	if (!["hospital", "admin"].includes(actorRole)) {
		throw new Error("Only hospital or admin can notify ambulance driver");
	}

	const emergency = await EmergencyRequest.findById(id)
		.populate("patientId", "name contactNumber address buildingAddress laneAddress")
		.populate("ambulanceId", "driverName driverPhone vehicleNumber")
		.populate("hospitalId", "name phone");

	if (!emergency) {
		throw new Error("Emergency request not found");
	}

	if (actorRole === "hospital" && String(emergency.hospitalId?._id || emergency.hospitalId) !== String(actorId)) {
		throw new Error("Emergency request not found");
	}

	const driverPhone = emergency.ambulanceId?.driverPhone;
	if (!driverPhone) {
		throw new Error("Assigned ambulance driver phone is not available");
	}

	const patientName = emergency.patientSnapshot?.name || emergency.patientId?.name || "Patient";
	const patientPhone = emergency.patientSnapshot?.contactNumber || emergency.patientId?.contactNumber || "N/A";
	const patientAddress =
		emergency.patientSnapshot?.address ||
		[emergency.patientId?.buildingAddress, emergency.patientId?.laneAddress, emergency.patientId?.address].filter(Boolean).join(", ") ||
		"N/A";
	const hospitalName = emergency.hospitalId?.name || "Hospital";

	const smsBody = [
		`Emergency dispatch from ${hospitalName}.`,
		`Patient: ${patientName}`,
		`Patient Phone: ${patientPhone}`,
		`Address: ${patientAddress}`,
		`Emergency ID: ${String(emergency._id)}`,
	].join(" ");

	const smsResult = await sendSmsReminder({
		to: driverPhone,
		body: smsBody,
	});

	return {
		message: smsResult?.skipped
			? "SMS could not be sent automatically. Use call button for manual alert."
			: "Ambulance driver notified by SMS",
		sms: smsResult,
		driver: {
			name: emergency.ambulanceId?.driverName || "Driver",
			phone: driverPhone,
			vehicleNumber: emergency.ambulanceId?.vehicleNumber || "",
		},
	};
};

export {
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
};
