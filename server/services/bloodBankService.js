import BloodBank from "../models/bloodBankModel.js";
import { ensureValidBloodGroup, normalizeBloodGroup, toGeoPoint } from "../utils/bloodUtils.js";
import { searchDonorsService } from "./donorService.js";

const normalizeAvailableGroups = (groups = []) => {
  if (!Array.isArray(groups)) {
    throw new Error("availableBloodGroups must be an array");
  }

  return groups.map((item) => {
    const group = ensureValidBloodGroup(item?.group);
    const units = Number(item?.units ?? 0);

    if (!Number.isFinite(units) || units < 0) {
      throw new Error("Blood units must be a non-negative number");
    }

    return {
      group,
      units,
    };
  });
};

const ensureNoDuplicateBloodBank = async ({ name, address, contactNumber, email }, currentId = null) => {
  const duplicateQuery = {
    $or: [
      { email: String(email || "").trim().toLowerCase() },
      {
        name: String(name || "").trim(),
        address: String(address || "").trim(),
        contactNumber: String(contactNumber || "").trim(),
      },
    ],
  };

  if (currentId) {
    duplicateQuery._id = { $ne: currentId };
  }

  const duplicate = await BloodBank.findOne(duplicateQuery);
  if (duplicate) {
    throw new Error("Blood bank entry already exists");
  }
};

const createBloodBankService = async (payload) => {
  const availableBloodGroups = normalizeAvailableGroups(payload?.availableBloodGroups || []);
  const location = toGeoPoint(payload?.lng ?? payload?.location?.coordinates?.[0], payload?.lat ?? payload?.location?.coordinates?.[1]);

  await ensureNoDuplicateBloodBank(payload);

  const bloodBank = await BloodBank.create({
    name: payload?.name,
    address: payload?.address,
    contactNumber: payload?.contactNumber,
    email: String(payload?.email || "").trim().toLowerCase(),
    location,
    availableBloodGroups,
    isActive: payload?.isActive ?? true,
  });

  return bloodBank;
};

const listBloodBanksService = async () => {
  return BloodBank.find().sort({ createdAt: -1 });
};

const getBloodBankByIdService = async (id) => {
  const bloodBank = await BloodBank.findById(id);
  if (!bloodBank) {
    throw new Error("Blood bank not found");
  }

  return bloodBank;
};

const updateBloodBankService = async (id, payload) => {
  const existing = await BloodBank.findById(id);
  if (!existing) {
    throw new Error("Blood bank not found");
  }

  const nextPayload = {
    name: payload?.name ?? existing.name,
    address: payload?.address ?? existing.address,
    contactNumber: payload?.contactNumber ?? existing.contactNumber,
    email: String(payload?.email ?? existing.email).trim().toLowerCase(),
    isActive: payload?.isActive ?? existing.isActive,
  };

  await ensureNoDuplicateBloodBank(nextPayload, id);

  if (Array.isArray(payload?.availableBloodGroups)) {
    nextPayload.availableBloodGroups = normalizeAvailableGroups(payload.availableBloodGroups);
  }

  if (Object.prototype.hasOwnProperty.call(payload || {}, "lng") || Object.prototype.hasOwnProperty.call(payload || {}, "lat") || payload?.location) {
    nextPayload.location = toGeoPoint(payload?.lng ?? payload?.location?.coordinates?.[0], payload?.lat ?? payload?.location?.coordinates?.[1]);
  }

  const updated = await BloodBank.findByIdAndUpdate(id, nextPayload, { new: true, runValidators: true });
  return updated;
};

const deleteBloodBankService = async (id) => {
  const bloodBank = await BloodBank.findByIdAndDelete(id);
  if (!bloodBank) {
    throw new Error("Blood bank not found");
  }

  return bloodBank;
};

const searchNearbyBloodBanksService = async ({ group, lng, lat, radius = 5000 }) => {
  const normalizedGroup = ensureValidBloodGroup(group);
  const maxDistance = Number(radius);
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    throw new Error("Invalid radius");
  }

  const nearPoint = toGeoPoint(lng, lat);

  const bloodBanks = await BloodBank.find({
    isActive: true,
    availableBloodGroups: {
      $elemMatch: {
        group: normalizeBloodGroup(normalizedGroup),
        units: { $gt: 0 },
      },
    },
    location: {
      $near: {
        $geometry: nearPoint,
        $maxDistance: maxDistance,
      },
    },
  }).limit(100);

  if (bloodBanks.length > 0) {
    return { bloodBanks, donors: [] };
  }

  const donors = await searchDonorsService({ group: normalizedGroup, lng, lat, radius: maxDistance });
  return { bloodBanks: [], donors };
};

export {
  createBloodBankService,
  listBloodBanksService,
  getBloodBankByIdService,
  updateBloodBankService,
  deleteBloodBankService,
  searchNearbyBloodBanksService,
};
