import {
  createBloodRequestService,
  getBloodRequestByIdService,
  updateBloodRequestStatusService,
} from "../services/bloodRequestService.js";

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

const createBloodRequestController = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      requesterId: req.userId,
      requesterRole: req.userRole,
    };

    const bloodRequest = await createBloodRequestService(payload);
    return success(res, "Blood request created successfully", bloodRequest, 201);
  } catch (error) {
    return failure(res, error, 400);
  }
};

const getBloodRequestByIdController = async (req, res) => {
  try {
    const bloodRequest = await getBloodRequestByIdService(req.params.id, req.userId, req.userRole);
    return success(res, "Blood request fetched successfully", bloodRequest);
  } catch (error) {
    const status = error.message === "Blood request not found" ? 404 : 400;
    return failure(res, error, status);
  }
};

const updateBloodRequestStatusController = async (req, res) => {
  try {
    const bloodRequest = await updateBloodRequestStatusService(req.params.id, req.body?.status);
    return success(res, "Blood request status updated", bloodRequest);
  } catch (error) {
    const status = error.message === "Blood request not found" ? 404 : 400;
    return failure(res, error, status);
  }
};

export {
  createBloodRequestController,
  getBloodRequestByIdController,
  updateBloodRequestStatusController,
};
