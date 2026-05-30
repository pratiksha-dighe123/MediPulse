import { Router } from "express";
import { requireRoles } from "../middleware/authMiddleware.js";
import {
  createBloodRequestController,
  getBloodRequestByIdController,
  updateBloodRequestStatusController,
} from "../controllers/bloodRequestController.js";

const bloodRequestRouter = Router();

bloodRequestRouter.post("/", requireRoles("patient", "doctor", "hospital", "admin"), createBloodRequestController);
bloodRequestRouter.get("/:id", requireRoles("patient", "doctor", "hospital", "admin"), getBloodRequestByIdController);
bloodRequestRouter.put("/:id/status", requireRoles("hospital", "admin"), updateBloodRequestStatusController);

export default bloodRequestRouter;
