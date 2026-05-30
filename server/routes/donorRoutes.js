import { Router } from "express";
import { requireRoles } from "../middleware/authMiddleware.js";
import { registerDonorController, searchDonorsController, getAllDonorsController, getPublicDonorStatsController } from "../controllers/donorController.js";

const donorRouter = Router();

donorRouter.post("/public/register", registerDonorController);
donorRouter.get("/public/stats", getPublicDonorStatsController);
donorRouter.get("/search", requireRoles("patient", "doctor", "hospital", "admin"), searchDonorsController);
donorRouter.get("/", requireRoles("admin"), getAllDonorsController);

export default donorRouter;
