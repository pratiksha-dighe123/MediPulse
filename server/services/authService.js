//create login and register service functions here
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Patient from "../models/patientModel.js";
import Doctor from "../models/doctorModel.js";
import Admin from "../models/adminModel.js";
import Hospital from "../models/hospitalModel.js";
import Ambulance from "../models/ambulanceModel.js";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toPoint = (lng, lat, label) => {
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


const registerPatientService = async (patientData) => {
    try {
        // Check if email already exists
        const existingPatient = await Patient.findOne({ email: patientData.email });
        if (existingPatient) {
            throw new Error("Email already in use");
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(patientData.password, 10);
        patientData.password = hashedPassword;

        patientData.geoLocation = toPoint(patientData.lng, patientData.lat, "Patient");
        patientData.address = String(patientData.address || "").trim() || "Patient home";
        patientData.buildingAddress = String(patientData.buildingAddress || patientData.address || "").trim();
        patientData.laneAddress = String(patientData.laneAddress || patientData.address || "").trim();
        patientData.bloodGroup = String(patientData.bloodGroup || "").trim().toUpperCase();
        delete patientData.lng;
        delete patientData.lat;

        // Create and save the patient
        const newPatient = new Patient(patientData);
        await newPatient.save();

        return { message: "Patient registered successfully" };
    } catch (error) {
        throw error;
    }
};

const registerDoctorService = async (doctorData) => {
    try {
        if (!doctorData.hospitalId) {
            throw new Error("Hospital is required for doctor registration");
        }

        const hospital = await Hospital.findById(doctorData.hospitalId);
        if (!hospital) {
            throw new Error("Selected hospital does not exist");
        }

        if (hospital.status !== "approved") {
            throw new Error("Selected hospital is not approved yet");
        }

        // Check if email already exists
        const existingDoctor = await Doctor.findOne({ email: doctorData.email });
        if (existingDoctor) {
            throw new Error("Email already in use");
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(doctorData.password, 10);
        doctorData.password = hashedPassword;
        doctorData.contact = doctorData.contact || doctorData.contactNumber;
        doctorData.homeAddress = String(doctorData.homeAddress || doctorData.address || "").trim();
        doctorData.address = doctorData.homeAddress;
        doctorData.buildingAddress = String(doctorData.buildingAddress || doctorData.homeAddress || "").trim();
        doctorData.laneAddress = String(doctorData.laneAddress || doctorData.homeAddress || "").trim();
        doctorData.bloodGroup = String(doctorData.bloodGroup || "").trim().toUpperCase();
        doctorData.homeLocation = toPoint(doctorData.lng, doctorData.lat, "Doctor home");
        delete doctorData.lng;
        delete doctorData.lat;
        doctorData.approvalStatus = "pending";
        doctorData.isApproved = false;
        doctorData.available = typeof doctorData.available === "boolean" ? doctorData.available : true;

        const activeStart = String(doctorData?.activeHours?.start || "09:00").trim();
        const activeEnd = String(doctorData?.activeHours?.end || "17:00").trim();

        if (!TIME_PATTERN.test(activeStart) || !TIME_PATTERN.test(activeEnd)) {
            throw new Error("Active hours must be in HH:mm format");
        }

        doctorData.activeHours = {
            start: activeStart,
            end: activeEnd,
        };

        if (doctorData.available) {
            doctorData.unavailableReason = null;
        }

        // Create and save the doctor
        const newDoctor = new Doctor(doctorData);
        await newDoctor.save();

        return { message: "Doctor registered successfully and is pending admin approval" };
    } catch (error) {
        throw error;
    }
};

const registerDriverService = async (driverData) => {
    const vehicleNumber = String(driverData.vehicleNumber || "").trim().toUpperCase();
    const driverPhone = String(driverData.driverPhone || "").trim();
    const driverEmail = String(driverData.email || "").trim().toLowerCase();
    const password = String(driverData.password || "");
    const hospitalId = String(driverData.hospitalId || "").trim();
    const hospitalName = String(driverData.hospitalName || "").trim();
    const driverName = String(driverData.driverName || "").trim();
    const driverBloodGroup = String(driverData.driverBloodGroup || "").trim().toUpperCase();
    const address = String(driverData.address || "").trim();

    if (!vehicleNumber || !driverPhone || !driverEmail || !password) {
        throw new Error("vehicleNumber, driverPhone, email, and password are required");
    }

    const duplicateEmail = await Ambulance.findOne({ driverEmail });
    if (duplicateEmail) {
        throw new Error("Email already in use");
    }

    let ambulance = await Ambulance.findOne({ vehicleNumber });

    if (!ambulance) {
        const resolvedHospital = hospitalId
            ? await Hospital.findById(hospitalId)
            : await Hospital.findOne({
                name: { $regex: `^${hospitalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
            });

        if (!resolvedHospital) {
            throw new Error("Hospital not found. Provide valid hospital name or hospitalId");
        }

        if (resolvedHospital.status !== "approved") {
            throw new Error("Selected hospital is not approved yet");
        }

        if (!driverName || !driverBloodGroup) {
            throw new Error("driverName and driverBloodGroup are required for new ambulance registration");
        }

        ambulance = await Ambulance.create({
            vehicleNumber,
            driverName,
            driverPhone,
            driverEmail,
            driverBloodGroup,
            address,
            hospitalId: resolvedHospital._id,
            location: toPoint(driverData.lng, driverData.lat, "Ambulance"),
            status: "AVAILABLE",
            isActive: true,
            password: await bcrypt.hash(password, 10),
        });

        return { message: "Driver and ambulance registered successfully" };
    }

    if (String(ambulance.driverPhone || "").trim() !== driverPhone) {
        throw new Error("Driver phone does not match ambulance record");
    }

    if (!ambulance.isActive) {
        throw new Error("Ambulance account is inactive");
    }

    ambulance.driverEmail = driverEmail;
    ambulance.password = await bcrypt.hash(password, 10);
    await ambulance.save();

    return { message: "Driver registered successfully" };
};

const loginService = async (email, password, requestedRole) => {
    try {
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedRole = requestedRole ? String(requestedRole).toLowerCase() : null;
        let user = null;
        let role = null;

        if (normalizedRole === "admin") {
            user = await Admin.findOne({ email: normalizedEmail });
            role = "admin";
        } else if (normalizedRole === "doctor") {
            user = await Doctor.findOne({ email: normalizedEmail }).select('+password');
            role = "doctor";
        } else if (normalizedRole === "hospital") {
            user = await Hospital.findOne({ email: normalizedEmail });
            role = "hospital";
        } else if (normalizedRole === "patient") {
            user = await Patient.findOne({ email: normalizedEmail });
            role = "patient";
        } else if (normalizedRole === "driver") {
            user = await Ambulance.findOne({ driverEmail: normalizedEmail }).select("+password");
            role = "driver";
        } else {
            // Default lookup order prioritizes admin accounts.
            user = await Admin.findOne({ email: normalizedEmail });
            role = "admin";

            if (!user) {
                user = await Doctor.findOne({ email: normalizedEmail }).select('+password');
                role = "doctor";
            }

            if (!user) {
                user = await Hospital.findOne({ email: normalizedEmail });
                role = "hospital";
            }

            if (!user) {
                user = await Patient.findOne({ email: normalizedEmail });
                role = "patient";
            }

            if (!user) {
                user = await Ambulance.findOne({ driverEmail: normalizedEmail }).select("+password");
                role = "driver";
            }
        }

        if (!user) {
            throw new Error("User not found");
        }

        if (!user.password) {
            throw new Error("Invalid account configuration");
        }

        if (role === "doctor" && !user.isApproved) {
            throw new Error("Doctor account is pending admin approval");
        }

        if (role === "hospital" && user.status !== "approved") {
            throw new Error("Hospital account is pending admin approval");
        }

        if (role === "driver" && !user.isActive) {
            throw new Error("Driver account is inactive");
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error("Invalid credentials");
        }

        // Generate JWT token without expiry so user stays logged in until explicit logout
        const token = jwt.sign({ id: user._id, role }, process.env.JWT_SECRET);

        return { message: "User logged in successfully", token };
    } catch (error) {
        throw error;
    }
};

export { registerPatientService, registerDoctorService, registerDriverService, loginService };