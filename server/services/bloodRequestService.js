import BloodRequest from "../models/bloodRequestModel.js";
import BloodBank from "../models/bloodBankModel.js";
import { ensureValidBloodGroup, toGeoPoint } from "../utils/bloodUtils.js";
import { broadcastNewBloodRequest } from "./realtimeService.js";

const createBloodRequestService = async ({ requesterId, requesterRole, bloodGroup, unitsRequired, lng, lat }) => {
  const normalizedGroup = ensureValidBloodGroup(bloodGroup);
  const requiredUnits = Number(unitsRequired);

  if (!Number.isFinite(requiredUnits) || requiredUnits <= 0) {
    throw new Error("unitsRequired must be greater than 0");
  }

  if (!requesterId || !requesterRole) {
    throw new Error("requester details are required");
  }

  const location = toGeoPoint(lng, lat);

  const nearestBloodBank = await BloodBank.findOne({
    isActive: true,
    availableBloodGroups: {
      $elemMatch: {
        group: normalizedGroup,
        units: { $gte: requiredUnits },
      },
    },
    location: {
      $near: {
        $geometry: location,
      },
    },
  }).select("name contactNumber location");

  const bloodRequest = await BloodRequest.create({
    requesterId,
    requesterRole,
    bloodGroup: normalizedGroup,
    unitsRequired: requiredUnits,
    location,
    status: "PENDING",
    assignedBloodBankId: nearestBloodBank?._id || null,
  });

  broadcastNewBloodRequest({
    requestId: bloodRequest._id,
    requesterId,
    requesterRole,
    bloodGroup: normalizedGroup,
    unitsRequired: requiredUnits,
    location,
    assignedBloodBankId: nearestBloodBank?._id || null,
  });

  return bloodRequest;
};

const getBloodRequestByIdService = async (id, userId, userRole) => {
  const request = await BloodRequest.findById(id).populate("assignedBloodBankId", "name contactNumber address");

  if (!request) {
    throw new Error("Blood request not found");
  }

  if (userRole !== "admin" && userRole !== "hospital") {
    if (String(request.requesterId) !== String(userId)) {
      throw new Error("Blood request not found");
    }
  }

  return request;
};

const updateBloodRequestStatusService = async (id, status) => {
  const allowed = ["PENDING", "FULFILLED", "CANCELLED"];
  const nextStatus = String(status || "").trim().toUpperCase();

  if (!allowed.includes(nextStatus)) {
    throw new Error("Invalid status value");
  }

  const request = await BloodRequest.findByIdAndUpdate(
    id,
    { status: nextStatus },
    { new: true, runValidators: true }
  ).populate("assignedBloodBankId", "name contactNumber address");

  if (!request) {
    throw new Error("Blood request not found");
  }

  return request;
};

export {
  createBloodRequestService,
  getBloodRequestByIdService,
  updateBloodRequestStatusService,
};
