const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const normalizeBloodGroup = (group) => {
  if (!group) return "";
  return String(group).trim().toUpperCase().replace(/\s+/g, "");
};

const isValidBloodGroup = (group) => BLOOD_GROUPS.includes(normalizeBloodGroup(group));

const ensureValidBloodGroup = (group) => {
  const normalized = normalizeBloodGroup(group);
  if (!isValidBloodGroup(normalized)) {
    throw new Error("Invalid blood group format");
  }
  return normalized;
};

const toGeoPoint = (lng, lat) => {
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

export { BLOOD_GROUPS, normalizeBloodGroup, isValidBloodGroup, ensureValidBloodGroup, toGeoPoint };
