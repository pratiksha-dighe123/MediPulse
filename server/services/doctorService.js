//Create doctor service functions here
import Doctor from "../models/doctorModel.js";
import bcrypt from "bcrypt";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

const normalizeDoctorAvailabilityPayload = (payload) => {
    const normalized = { ...payload };

    if (normalized.activeHours) {
        const start = String(normalized.activeHours.start || "").trim();
        const end = String(normalized.activeHours.end || "").trim();

        if (start && !TIME_PATTERN.test(start)) {
            throw new Error("Active start time must be in HH:mm format");
        }

        if (end && !TIME_PATTERN.test(end)) {
            throw new Error("Active end time must be in HH:mm format");
        }

        normalized.activeHours = {
            start: start || "09:00",
            end: end || "17:00",
        };
    }

    if (normalized.available === true) {
        normalized.unavailableReason = null;
    }

    return normalized;
};

const getAllDoctorsService = async (actorRole, actorId) => {
    try {
        const query = actorRole === "hospital" ? { hospitalId: actorId } : {};

        const doctors = await Doctor.find(query)
            .select("-password")
            .populate('hospitalId', 'name email');
        return doctors;
    } catch (error) {
        throw error;
    }
};

const getDoctorByIdService = async (id, actorRole, actorId) => {
    try {
        if (actorRole === "doctor" && String(id) !== String(actorId)) {
            throw new Error("Doctor not found");
        }

        const query = actorRole === "hospital" ? { _id: id, hospitalId: actorId } : { _id: id };
        const doctor = await Doctor.findOne(query)
            .select("-password")
            .populate('hospitalId', 'name email');
        if (!doctor) {
            throw new Error("Doctor not found");
        }
        return doctor;
    } catch (error) {
        throw error;
    }
};

const getDoctorsForBookingService = async (searchTerm = "", hospitalId = "") => {
    try {
        const baseQuery = { isApproved: true };

        if (hospitalId) {
            baseQuery.hospitalId = hospitalId;
        }

        const query = searchTerm
            ? {
                ...baseQuery,
                $or: [
                    { name: { $regex: searchTerm, $options: "i" } },
                    { specialization: { $regex: searchTerm, $options: "i" } },
                ],
            }
            : baseQuery;

        const doctors = await Doctor.find(query)
            .select("_id name specialization experience homeAddress homeLocation address hospitalId available unavailableReason activeHours")
            .populate('hospitalId', 'name')
            .limit(hospitalId ? 100 : 20)
            .sort({ name: 1 });

        return doctors;
    } catch (error) {
        throw error;
    }
};

const createDoctorService = async (doctorData, actorRole, actorId) => {
    try {
        const payload = normalizeDoctorAvailabilityPayload({ ...doctorData });

        if (payload.email) {
            payload.email = String(payload.email).trim().toLowerCase();
        }

        if (payload.password) {
            payload.password = await bcrypt.hash(payload.password, 10);
        }

        payload.contact = payload.contact || payload.contactNumber;
        payload.homeAddress = String(payload.homeAddress || payload.address || "").trim();
        payload.address = payload.homeAddress;
        payload.buildingAddress = String(payload.buildingAddress || payload.homeAddress || "").trim();
        payload.laneAddress = String(payload.laneAddress || payload.homeAddress || "").trim();
        payload.bloodGroup = String(payload.bloodGroup || "").trim().toUpperCase();
        payload.homeLocation = toPoint(payload.lng, payload.lat, "Doctor home");
        delete payload.lng;
        delete payload.lat;

        if (actorRole === "hospital") {
            payload.hospitalId = actorId;
            payload.isApproved = false;
            payload.approvalStatus = "pending";
        }

        const newDoctor = new Doctor(payload);
        await newDoctor.save();
        return {
            message: actorRole === "hospital" ? "Doctor created and pending hospital verification" : "Doctor created successfully",
            doctor: await Doctor.findById(newDoctor._id).select("-password").populate('hospitalId', 'name email'),
        };
    } catch (error) {
        throw error;
    }
};

const updateDoctorService = async (id, doctorData, actorRole, actorId) => {
    try {
        const payload = normalizeDoctorAvailabilityPayload({ ...doctorData });

        if (payload.email) {
            payload.email = String(payload.email).trim().toLowerCase();
        }

        if (payload.password) {
            payload.password = await bcrypt.hash(payload.password, 10);
        }

        if (payload.contactNumber && !payload.contact) {
            payload.contact = payload.contactNumber;
        }

        if (payload.homeAddress || payload.address) {
            payload.homeAddress = String(payload.homeAddress || payload.address || "").trim();
            payload.address = payload.homeAddress;
        }

        if (payload.buildingAddress || payload.homeAddress) {
            payload.buildingAddress = String(payload.buildingAddress || payload.homeAddress || "").trim();
        }

        if (payload.laneAddress || payload.homeAddress) {
            payload.laneAddress = String(payload.laneAddress || payload.homeAddress || "").trim();
        }

        if (payload.bloodGroup) {
            payload.bloodGroup = String(payload.bloodGroup).trim().toUpperCase();
        }

        if (Object.prototype.hasOwnProperty.call(payload, "lng") || Object.prototype.hasOwnProperty.call(payload, "lat")) {
            payload.homeLocation = toPoint(payload.lng, payload.lat, "Doctor home");
            delete payload.lng;
            delete payload.lat;
        }

        if (actorRole === "doctor" && String(id) !== String(actorId)) {
            throw new Error("Doctor not found");
        }

        if (actorRole === "hospital") {
            delete payload.hospitalId;
        }

        const query = actorRole === "hospital" ? { _id: id, hospitalId: actorId } : { _id: id };

        const updatedDoctor = await Doctor.findOneAndUpdate(query, payload, { new: true })
            .select("-password")
            .populate('hospitalId', 'name email');
        if (!updatedDoctor) {
            throw new Error("Doctor not found");
        }
        return { message: "Doctor updated successfully", doctor: updatedDoctor };
    } catch (error) {
        throw error;
    }
};

const deleteDoctorService = async (id, actorRole, actorId) => {
    try {
        const query = actorRole === "hospital" ? { _id: id, hospitalId: actorId } : { _id: id };
        const deletedDoctor = await Doctor.findOneAndDelete(query);
        if (!deletedDoctor) {
            throw new Error("Doctor not found");
        }
        return { message: "Doctor deleted successfully" };
    } catch (error) {
        throw error;
    }
};

export {
    getAllDoctorsService,
    getDoctorByIdService,
    getDoctorsForBookingService,
    createDoctorService,
    updateDoctorService,
    deleteDoctorService,
};

export const approveDoctorService = async (id, actorRole, actorId) => {
    try {
        let query = { _id: id };

        if (actorRole === 'hospital') {
            query = { _id: id, hospitalId: actorId };
        }

        const doctor = await Doctor.findOneAndUpdate(query, { isApproved: true, approvalStatus: 'approved' }, { new: true })
            .select("-password");
        if (!doctor) {
            throw new Error("Doctor not found or not under your hospital");
        }
        return doctor;
    } catch (error) {
        throw error;
    }
};

export const rejectDoctorService = async (id, actorRole, actorId) => {
    try {
        let query = { _id: id };

        if (actorRole === 'hospital') {
            query = { _id: id, hospitalId: actorId };
        }

        const doctor = await Doctor.findOneAndUpdate(query, { isApproved: false, approvalStatus: 'rejected' }, { new: true })
            .select("-password");
        if (!doctor) {
            throw new Error("Doctor not found or not under your hospital");
        }
        return doctor;
    } catch (error) {
        throw error;
    }
};

export const getDoctorsByHospitalService = async (hospitalId, status = null) => {
    try {
        const query = { hospitalId };
        if (status) query.approvalStatus = status;

        const doctors = await Doctor.find(query)
            .select("-password")
            .populate('hospitalId', 'name email')
            .sort({ createdAt: -1 });
        return doctors;
    } catch (error) {
        throw error;
    }
};

export const getPendingDoctorsService = async (hospitalId = null) => {
    try {
        const query = { approvalStatus: 'pending' };
        if (hospitalId) query.hospitalId = hospitalId;

        const doctors = await Doctor.find(query)
            .select("-password")
            .populate('hospitalId', 'name email')
            .sort({ createdAt: -1 });
        return doctors;
    } catch (error) {
        throw error;
    }
};

export const getDoctorStatisticsService = async (hospitalId = null) => {
    try {
        const query = hospitalId ? { hospitalId } : {};

        const total = await Doctor.countDocuments(query);
        const approved = await Doctor.countDocuments({ ...query, isApproved: true });
        const pending = await Doctor.countDocuments({ ...query, approvalStatus: 'pending' });
        const rejected = await Doctor.countDocuments({ ...query, approvalStatus: 'rejected' });

        return { total, approved, pending, rejected };
    } catch (error) {
        throw error;
    }
};