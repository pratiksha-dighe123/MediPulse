import {
  createBloodBankService,
  listBloodBanksService,
  getBloodBankByIdService,
  updateBloodBankService,
  deleteBloodBankService,
  searchNearbyBloodBanksService,
} from "../services/bloodBankService.js";

const success = (res, message, data, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const failure = (res, error, status = 400) => {
  return res.status(status).json({
    success: false,
    message: error?.message || "Request failed",
    data: null,
  });
};

const createBloodBankController = async (req, res) => {
  try {
    const bloodBank = await createBloodBankService(req.body);
    return success(res, "Blood bank created successfully", bloodBank, 201);
  } catch (error) {
    const status = error.message === "Blood bank entry already exists" ? 409 : 400;
    return failure(res, error, status);
  }
};

const listBloodBanksController = async (req, res) => {
  try {
    const bloodBanks = await listBloodBanksService();
    return success(res, "Blood banks fetched successfully", bloodBanks);
  } catch (error) {
    return failure(res, error, 400);
  }
};

const getBloodBankByIdController = async (req, res) => {
  try {
    const bloodBank = await getBloodBankByIdService(req.params.id);
    return success(res, "Blood bank fetched successfully", bloodBank);
  } catch (error) {
    const status = error.message === "Blood bank not found" ? 404 : 400;
    return failure(res, error, status);
  }
};

const updateBloodBankController = async (req, res) => {
  try {
    const bloodBank = await updateBloodBankService(req.params.id, req.body);
    return success(res, "Blood bank updated successfully", bloodBank);
  } catch (error) {
    const status = error.message === "Blood bank not found" ? 404 : error.message === "Blood bank entry already exists" ? 409 : 400;
    return failure(res, error, status);
  }
};

const deleteBloodBankController = async (req, res) => {
  try {
    const bloodBank = await deleteBloodBankService(req.params.id);
    return success(res, "Blood bank deleted successfully", bloodBank);
  } catch (error) {
    const status = error.message === "Blood bank not found" ? 404 : 400;
    return failure(res, error, status);
  }
};

const searchBloodBanksController = async (req, res) => {
  try {
    const result = await searchNearbyBloodBanksService(req.query);
    return success(res, "Blood bank search completed", result);
  } catch (error) {
    return failure(res, error, 400);
  }
};

export {
  createBloodBankController,
  listBloodBanksController,
  getBloodBankByIdController,
  updateBloodBankController,
  deleteBloodBankController,
  searchBloodBanksController,
};
