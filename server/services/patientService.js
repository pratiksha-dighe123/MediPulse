//create patient service functions here
import Patient from "../models/patientModel.js";
import Hospital from "../models/hospitalModel.js";
import Ambulance from "../models/ambulanceModel.js";
import Doctor from "../models/doctorModel.js";
import bcrypt from "bcrypt";

const toPoint = (lng, lat, label = "Location") => {
    const parsedLng = Number(lng);
    const parsedLat = Number(lat);

    if (!Number.isFinite(parsedLng) || !Number.isFinite(parsedLat)) {
        throw new Error(`${label} coordinates are required in [lng, lat] format`);
    }

    return {
        type: "Point",
        coordinates: [parsedLng, parsedLat],
    };
};

const getAllPatientsService = async (actorRole, actorId) => {
    try {
        const query = actorRole === "hospital" ? { hospitalId: actorId } : {};
        const patients = await Patient.find(query)
            .select("-password")
            .populate("hospitalId", "name email");
        return patients;
    } catch (error) {
        throw error;
    }
};

const getPatientByIdService = async (id, actorRole, actorId) => {
    try {
        if (actorRole === "patient" && String(id) !== String(actorId)) {
            throw new Error("Patient not found");
        }

        const query = actorRole === "hospital" ? { _id: id, hospitalId: actorId } : { _id: id };
        const patient = await Patient.findOne(query).select("-password");
        if (!patient) {
            throw new Error(actorRole === "hospital" ? "Patient not found or not under your hospital" : "Patient not found");
        }
        return patient;
    } catch (error) {
        throw error;
    }
};

const createPatientService = async (patientData, actorRole, actorId) => {
    try {
        const payload = { ...patientData };

        if (payload.email) {
            payload.email = String(payload.email).trim().toLowerCase();
        }

        if (patientData.password) {
            payload.password = await bcrypt.hash(patientData.password, 10);
        }

        if (actorRole === "hospital") {
            payload.hospitalId = actorId;
        }

        payload.geoLocation = toPoint(payload.lng, payload.lat, "Patient");
        payload.address = String(payload.address || "").trim() || "Patient home";
        payload.buildingAddress = String(payload.buildingAddress || payload.address || "").trim();
        payload.laneAddress = String(payload.laneAddress || payload.address || "").trim();
        payload.bloodGroup = String(payload.bloodGroup || "").trim().toUpperCase();
        delete payload.lng;
        delete payload.lat;

        const newPatient = new Patient(payload);
        await newPatient.save();
        return { message: "Patient created successfully", patient: await Patient.findById(newPatient._id).select("-password") };
    } catch (error) {
        throw error;
    }
};

const updatePatientService = async (id, patientData, actorRole, actorId) => {
    try {
        const payload = { ...patientData };

        if (payload.email) {
            payload.email = String(payload.email).trim().toLowerCase();
        }

        if (payload.password) {
            payload.password = await bcrypt.hash(payload.password, 10);
        }

        if (actorRole === "hospital") {
            delete payload.hospitalId;
        }

        if (Object.prototype.hasOwnProperty.call(payload, "lng") || Object.prototype.hasOwnProperty.call(payload, "lat")) {
            payload.geoLocation = toPoint(payload.lng, payload.lat, "Patient");
            delete payload.lng;
            delete payload.lat;
        }

        if (payload.bloodGroup) {
            payload.bloodGroup = String(payload.bloodGroup).trim().toUpperCase();
        }

        if (payload.address || payload.buildingAddress || payload.laneAddress) {
            const resolvedAddress = String(payload.address || "").trim();
            payload.address = resolvedAddress || String(payload.buildingAddress || payload.laneAddress || "").trim();
            payload.buildingAddress = String(payload.buildingAddress || payload.address || "").trim();
            payload.laneAddress = String(payload.laneAddress || payload.address || "").trim();
        }

        if (actorRole === "patient" && String(id) !== String(actorId)) {
            throw new Error("Patient not found");
        }

        const query = actorRole === "hospital" ? { _id: id, hospitalId: actorId } : { _id: id };

        const updatedPatient = await Patient.findOneAndUpdate(query, payload, { new: true }).select("-password");
        if (!updatedPatient) {
            throw new Error(actorRole === "hospital" ? "Patient not found or not under your hospital" : "Patient not found");
        }
        return { message: "Patient updated successfully", patient: updatedPatient };
    } catch (error) {
        throw error;
    }
};

const deletePatientService = async (id, actorRole, actorId) => {
    try {
        const query = actorRole === "hospital" ? { _id: id, hospitalId: actorId } : { _id: id };
        const deletedPatient = await Patient.findOneAndDelete(query);
        if (!deletedPatient) {
            throw new Error(actorRole === "hospital" ? "Patient not found or not under your hospital" : "Patient not found");
        }
        return { message: "Patient deleted successfully" };
    } catch (error) {
        throw error;
    }
};

const getNearbySupportForPatientService = async (patientId, radius = 10000) => {
    const patient = await Patient.findById(patientId).select("geoLocation");
    if (!patient) {
        throw new Error("Patient not found");
    }

    if (!patient.geoLocation?.coordinates?.length) {
        throw new Error("Patient location is missing. Please update profile coordinates.");
    }

    const maxDistance = Number(radius);

    const nearestHospital = await Hospital.findOne({
        status: "approved",
        location: {
            $near: {
                $geometry: patient.geoLocation,
                $maxDistance: maxDistance,
            },
        },
    }).select("name phone location address");

    const nearestAmbulance = await Ambulance.findOne({
        status: "AVAILABLE",
        isActive: true,
        location: {
            $near: {
                $geometry: patient.geoLocation,
                $maxDistance: maxDistance,
            },
        },
    }).select("vehicleNumber driverName driverPhone hospitalId location status");

    const nearestDoctor = await Doctor.findOne({
        isApproved: true,
        available: true,
        homeLocation: {
            $near: {
                $geometry: patient.geoLocation,
                $maxDistance: maxDistance,
            },
        },
    })
        .select("name specialization contactNumber homeAddress homeLocation hospitalId")
        .populate("hospitalId", "name");

    return {
        patientLocation: patient.geoLocation,
        nearestHospital,
        nearestAmbulance,
        nearestDoctor,
    };
};

export {
    getAllPatientsService,
    getPatientByIdService,
    createPatientService,
    updatePatientService,
    deletePatientService,
    getNearbySupportForPatientService,
};