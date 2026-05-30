import { registerDonorService, getAllDonorsService, getPublicDonorStatsService, searchDonorsService } from "../services/donorService.js";

const registerDonorController = async (req, res) => {
  try {
    const donor = await registerDonorService(req.body);
    return res.status(201).json({
      success: true,
      message: "Donor registration saved successfully",
      data: donor,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Request failed",
      data: null,
    });
  }
};

const searchDonorsController = async (req, res) => {
  try {
    const donors = await searchDonorsService(req.query);
    return res.status(200).json({
      success: true,
      message: "Donor search completed",
      data: donors,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Request failed",
      data: null,
    });
  }
};

const getAllDonorsController = async (req, res) => {
  try {
    const donors = await getAllDonorsService();
    return res.status(200).json({
      success: true,
      message: "Donors fetched successfully",
      data: donors,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Request failed",
      data: null,
    });
  }
};

const getPublicDonorStatsController = async (req, res) => {
  try {
    const stats = await getPublicDonorStatsService();
    return res.status(200).json(stats);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Request failed",
      data: null,
    });
  }
};

export { registerDonorController, searchDonorsController, getAllDonorsController, getPublicDonorStatsController };
