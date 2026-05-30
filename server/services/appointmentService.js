//create appointment service functions here
import Appointment from "../models/appointmentModel.js";
import Doctor from "../models/doctorModel.js";
import Payment from "../models/paymentModel.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (timeValue) => {
    const value = String(timeValue || "").trim();
    if (!TIME_PATTERN.test(value)) {
        return null;
    }

    const [hours, minutes] = value.split(":").map(Number);
    return (hours * 60) + minutes;
};

const formatDoctorAvailabilityWindow = (doctor) => {
    const start = doctor?.activeHours?.start || "09:00";
    const end = doctor?.activeHours?.end || "17:00";
    return `${start} to ${end}`;
};

const ensureDoctorIsBookableAtTime = async (doctorId, appointmentTime) => {
    const doctor = await Doctor.findById(doctorId).select("name available activeHours");

    if (!doctor) {
        throw new Error("Doctor not found");
    }

    const availabilityWindow = formatDoctorAvailabilityWindow(doctor);

    if (!doctor.available) {
        throw new Error(`Doctor ${doctor.name} is available at time ${availabilityWindow}`);
    }

    const requestedTime = toMinutes(appointmentTime);
    if (requestedTime === null) {
        throw new Error("Appointment time must be in HH:mm format");
    }

    const activeStart = toMinutes(doctor?.activeHours?.start || "09:00");
    const activeEnd = toMinutes(doctor?.activeHours?.end || "17:00");

    if (activeStart === null || activeEnd === null || activeStart >= activeEnd) {
        throw new Error("Doctor active hours are invalid. Please contact hospital administration");
    }

    if (requestedTime < activeStart || requestedTime > activeEnd) {
        throw new Error(`Doctor ${doctor.name} is available at time ${availabilityWindow}`);
    }
};

const isClinicalUpdateRequest = (appointmentData = {}) => {
    const fields = ["diagnosis", "medicalPrescription", "medicineDescription"];
    return fields.some((field) => Object.prototype.hasOwnProperty.call(appointmentData, field));
};

const isPaymentSatisfied = ({ paymentStatus, paymentMethod, paymentAmount, paymentTransactionId }) => {
    if (paymentStatus !== "paid") return false;
    if (!["cash", "online", "upi"].includes(paymentMethod)) return false;
    if (!Number.isFinite(Number(paymentAmount)) || Number(paymentAmount) <= 0) return false;
    if (["online", "upi"].includes(paymentMethod) && !String(paymentTransactionId || "").trim()) return false;
    return true;
};

const getAuthorizedAppointmentQuery = (id, actorId, actorRole) => {
    if (actorRole === "doctor") {
        return { _id: id, doctorId: actorId };
    }

    if (actorRole === "admin") {
        return { _id: id };
    }

    return null;
};

const buildHydratedAppointmentById = async (id) => {
    return Appointment.findById(id)
        .populate({
            path: 'doctorId',
            select: 'name specialization email contact contactNumber bloodGroup homeAddress buildingAddress laneAddress hospitalId',
            populate: {
                path: 'hospitalId',
                select: 'name',
            },
        })
        .populate('patientId', 'name email age contactNumber bloodGroup address buildingAddress laneAddress');
};

const getRazorpayClient = () => {
    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!keyId || !keySecret) {
        throw new Error("Razorpay credentials are not configured");
    }

    return {
        keyId,
        keySecret,
        client: new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        }),
    };
};

const upsertPaymentLedger = async ({
    appointment,
    actorId,
    actorRole,
    paymentMethod,
    amount,
    status,
    paymentGateway = "manual",
    transactionId = "",
    razorpayOrderId = "",
    razorpayPaymentId = "",
    razorpaySignature = "",
    paidAt = null,
    notes = "",
}) => {
    const update = {
        appointmentId: appointment._id,
        hospitalId: appointment.doctorId?.hospitalId?._id || appointment.doctorId?.hospitalId,
        doctorId: appointment.doctorId?._id || appointment.doctorId,
        patientId: appointment.patientId?._id || appointment.patientId,
        collectedBy: actorId,
        collectedByRole: actorRole,
        paymentMethod,
        paymentGateway,
        status,
        amount,
        transactionId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paidAt,
        notes,
        currency: "INR",
    };

    return Payment.findOneAndUpdate(
        { appointmentId: appointment._id },
        { $set: update },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
};

const getAllAppointmentsService = async () => {
    try {
        const appointments = await Appointment.find()
            .sort({ appointmentDate: -1 })
            .populate({
                path: 'doctorId',
                select: 'name specialization email contact contactNumber bloodGroup homeAddress buildingAddress laneAddress hospitalId',
                populate: {
                    path: 'hospitalId',
                    select: 'name',
                },
            })
            .populate('patientId', 'name email age contactNumber bloodGroup address buildingAddress laneAddress');
        return appointments;
    } catch (error) {
        throw error;
    }
};

const getAppointmentByIdService = async (id) => {
    try {
        const appointment = await Appointment.findById(id)
            .populate({
                path: 'doctorId',
                select: 'name specialization email contact contactNumber bloodGroup homeAddress buildingAddress laneAddress hospitalId',
                populate: {
                    path: 'hospitalId',
                    select: 'name',
                },
            })
            .populate('patientId', 'name email age contactNumber bloodGroup address buildingAddress laneAddress');
        if (!appointment) {
            throw new Error("Appointment not found");
        }
        return appointment;
    } catch (error) {
        throw error;
    }
};

const getMyAppointmentsService = async (userId, role) => {
    try {
        let filter = {};

        if (role === "patient") {
            filter = { patientId: userId };
        } else if (role === "doctor") {
            filter = { doctorId: userId };
        }

        const appointments = await Appointment.find(filter)
            .sort({ appointmentDate: -1 })
            .populate({
                path: 'doctorId',
                select: 'name specialization email contact contactNumber bloodGroup homeAddress buildingAddress laneAddress hospitalId',
                populate: {
                    path: 'hospitalId',
                    select: 'name',
                },
            })
            .populate('patientId', 'name email age contactNumber bloodGroup address buildingAddress laneAddress');

        return appointments;
    } catch (error) {
        throw error;
    }
};

const createAppointmentService = async (appointmentData) => {
    try {
        await ensureDoctorIsBookableAtTime(appointmentData.doctorId, appointmentData.appointmentTime);

        const newAppointment = new Appointment(appointmentData);
        await newAppointment.save();
        const hydratedAppointment = await Appointment.findById(newAppointment._id)
            .populate({
                path: 'doctorId',
                select: 'name specialization email contact contactNumber bloodGroup homeAddress buildingAddress laneAddress hospitalId',
                populate: {
                    path: 'hospitalId',
                    select: 'name',
                },
            })
            .populate('patientId', 'name email age contactNumber bloodGroup address buildingAddress laneAddress');

        return { message: "Appointment created successfully", appointment: hydratedAppointment };
    } catch (error) {
        throw error;
    }
};

const updateAppointmentService = async (id, appointmentData, actorId, actorRole) => {
    try {
        let query = { _id: id };

        if (actorRole === "doctor") {
            query = { _id: id, doctorId: actorId };
        } else if (actorRole === "patient") {
            query = { _id: id, patientId: actorId };

            const disallowedFields = [
                "diagnosis",
                "medicalPrescription",
                "medicineDescription",
                "visitedAt",
                "paymentMethod",
                "paymentAmount",
                "paymentStatus",
                "paymentTransactionId",
                "paidAt",
            ];
            const hasDisallowedField = disallowedFields.some((field) => Object.prototype.hasOwnProperty.call(appointmentData, field));

            if (hasDisallowedField) {
                throw new Error("Not authorized to update this appointment");
            }

            if (appointmentData.status && appointmentData.status !== "cancelled") {
                throw new Error("Patients can only cancel appointments");
            }
        } else if (actorRole !== "admin") {
            throw new Error("Not authorized to update this appointment");
        }

        if (actorRole === "doctor" && (isClinicalUpdateRequest(appointmentData) || appointmentData.status === "completed")) {
            const existingAppointment = await Appointment.findOne(query);
            if (!existingAppointment) {
                throw new Error("Appointment not found or access denied");
            }

            const mergedPaymentSnapshot = {
                paymentStatus: appointmentData.paymentStatus ?? existingAppointment.paymentStatus,
                paymentMethod: appointmentData.paymentMethod ?? existingAppointment.paymentMethod,
                paymentAmount: appointmentData.paymentAmount ?? existingAppointment.paymentAmount,
                paymentTransactionId: appointmentData.paymentTransactionId ?? existingAppointment.paymentTransactionId,
            };

            if (!isPaymentSatisfied(mergedPaymentSnapshot)) {
                throw new Error("Payment must be completed before saving diagnosis/prescription");
            }
        }

        const existingAppointmentForUpdate = await Appointment.findOne(query).select("doctorId appointmentTime");

        if (!existingAppointmentForUpdate) {
            throw new Error("Appointment not found or access denied");
        }

        const nextDoctorId = appointmentData.doctorId || existingAppointmentForUpdate.doctorId;
        const nextAppointmentTime = appointmentData.appointmentTime || existingAppointmentForUpdate.appointmentTime;
        const shouldValidateDoctorAvailability =
            Boolean(appointmentData.doctorId) || Boolean(appointmentData.appointmentTime);

        if (shouldValidateDoctorAvailability) {
            await ensureDoctorIsBookableAtTime(nextDoctorId, nextAppointmentTime);
        }

        const updatedAppointment = await Appointment.findOneAndUpdate(query, appointmentData, { new: true })
            .populate({
                path: 'doctorId',
                select: 'name specialization email contact contactNumber hospitalId',
                populate: {
                    path: 'hospitalId',
                    select: 'name',
                },
            })
            .populate('patientId', 'name email age contactNumber');

        return { message: "Appointment updated successfully", appointment: updatedAppointment };
    } catch (error) {
        throw error;
    }
};

const recordAppointmentPaymentService = async (id, paymentData, actorId, actorRole) => {
    try {
        const method = String(paymentData?.paymentMethod || "").toLowerCase();
        const amount = Number(paymentData?.paymentAmount);
        const incomingTransactionId = String(paymentData?.paymentTransactionId || "").trim();

        if (!["cash", "upi", "online"].includes(method)) {
            throw new Error("Payment method must be cash or upi");
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Payment amount must be greater than 0");
        }

        if (method === "upi") {
            throw new Error("Use Razorpay flow for UPI payments");
        }

        const query = getAuthorizedAppointmentQuery(id, actorId, actorRole);

        if (!query) {
            throw new Error("Not authorized to record payment");
        }

        const appointment = await Appointment.findOne(query)
            .populate({
                path: 'doctorId',
                select: 'name specialization email contact contactNumber hospitalId',
                populate: {
                    path: 'hospitalId',
                    select: 'name',
                },
            })
            .populate('patientId', 'name email age contactNumber');

        if (!appointment) {
            throw new Error("Appointment not found or access denied");
        }

        if (appointment.paymentStatus === "paid") {
            throw new Error("Payment is already recorded for this appointment");
        }

        const transactionId = method === "online"
            ? (incomingTransactionId || `ONLINE-${Date.now()}-${Math.floor(Math.random() * 100000)}`)
            : "";

        appointment.paymentMethod = method;
        appointment.paymentAmount = amount;
        appointment.paymentStatus = "paid";
        appointment.paymentTransactionId = transactionId;
        appointment.paidAt = new Date();
        await appointment.save();

        await upsertPaymentLedger({
            appointment,
            actorId,
            actorRole,
            paymentMethod: method,
            amount,
            status: "paid",
            paymentGateway: "manual",
            transactionId,
            paidAt: appointment.paidAt,
        });

        return {
            message: "Payment recorded successfully",
            payment: {
                paymentMethod: appointment.paymentMethod,
                paymentAmount: appointment.paymentAmount,
                paymentStatus: appointment.paymentStatus,
                paymentTransactionId: appointment.paymentTransactionId,
                paidAt: appointment.paidAt,
            },
            appointment,
        };
    } catch (error) {
        throw error;
    }
};

const createAppointmentRazorpayOrderService = async (id, paymentData, actorId, actorRole) => {
    try {
        const amount = Number(paymentData?.paymentAmount);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Payment amount must be greater than 0");
        }

        const query = getAuthorizedAppointmentQuery(id, actorId, actorRole);

        if (!query) {
            throw new Error("Not authorized to record payment");
        }

        const appointment = await Appointment.findOne(query)
            .populate({
                path: 'doctorId',
                select: 'name specialization email contact contactNumber hospitalId',
                populate: {
                    path: 'hospitalId',
                    select: 'name',
                },
            })
            .populate('patientId', 'name email age contactNumber');

        if (!appointment) {
            throw new Error("Appointment not found or access denied");
        }

        if (appointment.paymentStatus === "paid") {
            throw new Error("Payment is already recorded for this appointment");
        }

        const { client, keyId } = getRazorpayClient();

        const order = await client.orders.create({
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `APPT-${appointment._id}-${Date.now()}`,
            notes: {
                appointmentId: String(appointment._id),
                doctorId: String(appointment.doctorId?._id || ""),
                patientId: String(appointment.patientId?._id || ""),
            },
        });

        await upsertPaymentLedger({
            appointment,
            actorId,
            actorRole,
            paymentMethod: "upi",
            amount,
            status: "pending",
            paymentGateway: "razorpay",
            razorpayOrderId: order.id,
            notes: "UPI payment initiated via Razorpay",
        });

        return {
            message: "Razorpay order created",
            keyId,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt,
            },
            appointment: {
                _id: appointment._id,
                patientName: appointment.patientId?.name,
                doctorName: appointment.doctorId?.name,
            },
        };
    } catch (error) {
        throw error;
    }
};

const verifyAppointmentRazorpayPaymentService = async (id, verificationData, actorId, actorRole) => {
    try {
        const query = getAuthorizedAppointmentQuery(id, actorId, actorRole);

        if (!query) {
            throw new Error("Not authorized to record payment");
        }

        const appointment = await Appointment.findOne(query)
            .populate({
                path: 'doctorId',
                select: 'name specialization email contact contactNumber hospitalId',
                populate: {
                    path: 'hospitalId',
                    select: 'name',
                },
            })
            .populate('patientId', 'name email age contactNumber');

        if (!appointment) {
            throw new Error("Appointment not found or access denied");
        }

        if (appointment.paymentStatus === "paid") {
            throw new Error("Payment is already recorded for this appointment");
        }

        const razorpayOrderId = String(verificationData?.razorpay_order_id || "").trim();
        const razorpayPaymentId = String(verificationData?.razorpay_payment_id || "").trim();
        const razorpaySignature = String(verificationData?.razorpay_signature || "").trim();

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            throw new Error("Razorpay verification payload is incomplete");
        }

        const { keySecret } = getRazorpayClient();
        const generatedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        if (generatedSignature !== razorpaySignature) {
            throw new Error("Razorpay signature verification failed");
        }

        const existingLedger = await Payment.findOne({ appointmentId: appointment._id });
        const amount = Number(existingLedger?.amount || verificationData?.paymentAmount || appointment.paymentAmount || 0);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Unable to resolve payment amount for Razorpay transaction");
        }

        appointment.paymentMethod = "upi";
        appointment.paymentAmount = amount;
        appointment.paymentStatus = "paid";
        appointment.paymentTransactionId = razorpayPaymentId;
        appointment.paidAt = new Date();
        await appointment.save();

        await upsertPaymentLedger({
            appointment,
            actorId,
            actorRole,
            paymentMethod: "upi",
            amount,
            status: "paid",
            paymentGateway: "razorpay",
            transactionId: razorpayPaymentId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            paidAt: appointment.paidAt,
            notes: "UPI payment completed via Razorpay",
        });

        const hydratedAppointment = await buildHydratedAppointmentById(appointment._id);

        return {
            message: "UPI payment verified successfully",
            payment: {
                paymentMethod: hydratedAppointment.paymentMethod,
                paymentAmount: hydratedAppointment.paymentAmount,
                paymentStatus: hydratedAppointment.paymentStatus,
                paymentTransactionId: hydratedAppointment.paymentTransactionId,
                paidAt: hydratedAppointment.paidAt,
            },
            appointment: hydratedAppointment,
        };
    } catch (error) {
        throw error;
    }
};

const deleteAppointmentService = async (id, actorId, actorRole) => {
    try {
        let query = { _id: id };

        if (actorRole === "patient") {
            query = { _id: id, patientId: actorId };
        } else if (actorRole && actorRole !== "admin") {
            throw new Error("Not authorized to delete this appointment");
        }

        const deletedAppointment = await Appointment.findOneAndDelete(query);
        if (!deletedAppointment) {
            throw new Error("Appointment not found");
        }
        return { message: "Appointment deleted successfully" };
    } catch (error) {
        throw error;
    }
};

export {
    getAllAppointmentsService,
    getAppointmentByIdService,
    getMyAppointmentsService,
    createAppointmentService,
    updateAppointmentService,
    deleteAppointmentService,
    recordAppointmentPaymentService,
    createAppointmentRazorpayOrderService,
    verifyAppointmentRazorpayPaymentService,
};