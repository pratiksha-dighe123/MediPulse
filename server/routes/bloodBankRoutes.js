import { Router } from "express";
import { requireRoles } from "../middleware/authMiddleware.js";
import {
  createBloodBankController,
  listBloodBanksController,
  getBloodBankByIdController,
  updateBloodBankController,
  deleteBloodBankController,
  searchBloodBanksController,
} from "../controllers/bloodBankController.js";

const bloodBankRouter = Router();

bloodBankRouter.get("/search", searchBloodBanksController);
bloodBankRouter.post("/", requireRoles("admin", "hospital"), createBloodBankController);
bloodBankRouter.get("/", listBloodBanksController);
bloodBankRouter.get("/:id", getBloodBankByIdController);
bloodBankRouter.put("/:id", requireRoles("admin", "hospital"), updateBloodBankController);
bloodBankRouter.delete("/:id", requireRoles("admin", "hospital"), deleteBloodBankController);

export default bloodBankRouter;
