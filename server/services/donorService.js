import Patient from "../models/patientModel.js";
import Doctor from "../models/doctorModel.js";
import Ambulance from "../models/ambulanceModel.js";
import Donor from "../models/donorModel.js";
import { ensureValidBloodGroup, toGeoPoint } from "../utils/bloodUtils.js";

const toRad = (value) => (value * Math.PI) / 180;

const getDistanceMeters = (from, to) => {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;

  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const normalizeContactNumber = (phone) => String(phone || "").replace(/\D/g, "");

const registerDonorService = async (payload = {}) => {
  const fullName = String(payload?.fullName || "").trim();
  const age = Number(payload?.age);
  const weightKg = Number(payload?.weightKg);
  const bloodGroup = ensureValidBloodGroup(payload?.bloodGroup);
  const contactNumber = normalizeContactNumber(payload?.contactNumber);
  const alternateContactNumber = normalizeContactNumber(payload?.alternateContactNumber);
  const address = String(payload?.address || "").trim();

  if (!fullName || fullName.length < 2) {
    throw new Error("Full name is required");
  }

  if (!Number.isFinite(age) || age < 18) {
    throw new Error("Only 18+ donors can register");
  }

  if (!Number.isFinite(weightKg) || weightKg <= 50) {
    throw new Error("Only donors with weight greater than 50 kg can register");
  }

  if (!contactNumber || contactNumber.length < 10) {
    throw new Error("Valid contact number is required");
  }

  let geoLocation = null;
  if (payload?.lng !== undefined && payload?.lat !== undefined) {
    geoLocation = toGeoPoint(payload.lng, payload.lat);
  }

  const donor = await Donor.create({
    fullName,
    age,
    weightKg,
    bloodGroup,
    contactNumber,
    alternateContactNumber,
    address,
    geoLocation,
    isEligible: age >= 18 && weightKg > 50,
  });

  return donor;
};

const getAllDonorsService = async () => {
  return Donor.find().sort({ createdAt: -1 });
};

const getPublicDonorStatsService = async () => {
  const [summary, grouped] = await Promise.all([
    Donor.countDocuments({
      isActive: true,
      isEligible: true,
      availabilityStatus: "AVAILABLE",
      consentGiven: true,
    }),
    Donor.aggregate([
      {
        $match: {
          isActive: true,
          isEligible: true,
          availabilityStatus: "AVAILABLE",
          consentGiven: true,
        },
      },
      {
        $group: {
          _id: "$bloodGroup",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          bloodGroup: "$_id",
          count: 1,
        },
      },
      {
        $sort: { bloodGroup: 1 },
      },
    ]),
  ]);

  return {
    totalAvailableDonors: summary,
    bloodGroupBreakdown: grouped,
  };
};

const searchDonorsService = async ({ group, lng, lat, radius = 10000 }) => {
  const normalizedGroup = ensureValidBloodGroup(group);
  const maxDistance = Number(radius);

  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    throw new Error("Invalid radius");
  }

  const nearPoint = toGeoPoint(lng, lat);

  const [patients, doctors, drivers, communityDonors] = await Promise.all([
    Patient.find({
      bloodGroup: normalizedGroup,
      geoLocation: {
        $near: {
          $geometry: nearPoint,
          $maxDistance: maxDistance,
        },
      },
    }).select("name contactNumber geoLocation"),
    Doctor.find({
      bloodGroup: normalizedGroup,
      available: true,
      homeLocation: {
        $near: {
          $geometry: nearPoint,
          $maxDistance: maxDistance,
        },
      },
    }).select("name contactNumber homeLocation"),
    Ambulance.find({
      driverBloodGroup: normalizedGroup,
      isActive: true,
      status: { $ne: "OFFLINE" },
      location: {
        $near: {
          $geometry: nearPoint,
          $maxDistance: maxDistance,
        },
      },
    }).select("driverName driverPhone location"),
    Donor.find({
      bloodGroup: normalizedGroup,
      isActive: true,
      isEligible: true,
      availabilityStatus: "AVAILABLE",
      consentGiven: true,
      geoLocation: {
        $near: {
          $geometry: nearPoint,
          $maxDistance: maxDistance,
        },
      },
    }).select("fullName contactNumber geoLocation address"),
  ]);

  const reference = nearPoint.coordinates;

  const mappedPatients = patients.map((item) => ({
    name: item.name,
    phone: item.contactNumber,
    role: "patient",
    location: item.geoLocation || null,
    distanceInMeters: item.geoLocation?.coordinates ? getDistanceMeters(reference, item.geoLocation.coordinates) : null,
  }));

  const mappedDoctors = doctors.map((item) => ({
    name: item.name,
    phone: item.contactNumber,
    role: "doctor",
    location: item.homeLocation || null,
    distanceInMeters: item.homeLocation?.coordinates ? getDistanceMeters(reference, item.homeLocation.coordinates) : null,
  }));

  const mappedDrivers = drivers.map((item) => ({
    name: item.driverName,
    phone: item.driverPhone,
    role: "driver",
    location: item.location || null,
    distanceInMeters: item.location?.coordinates ? getDistanceMeters(reference, item.location.coordinates) : null,
  }));

  const mappedCommunityDonors = communityDonors.map((item) => ({
    name: item.fullName,
    phone: item.contactNumber,
    role: "community_donor",
    address: item.address || "",
    location: item.geoLocation || null,
    distanceInMeters: item.geoLocation?.coordinates ? getDistanceMeters(reference, item.geoLocation.coordinates) : null,
  }));

  return [...mappedPatients, ...mappedDoctors, ...mappedDrivers, ...mappedCommunityDonors].sort((a, b) => {
    const first = Number.isFinite(a.distanceInMeters) ? a.distanceInMeters : Number.MAX_SAFE_INTEGER;
    const second = Number.isFinite(b.distanceInMeters) ? b.distanceInMeters : Number.MAX_SAFE_INTEGER;
    return first - second;
  });
};

export { registerDonorService, getAllDonorsService, getPublicDonorStatsService, searchDonorsService };
