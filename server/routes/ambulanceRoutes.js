import { Router } from "express";
import { requireRoles } from "../middleware/authMiddleware.js";
import {
	createAmbulanceController,
	getAllAmbulancesController,
	getPublicAmbulancesController,
	getAmbulanceByIdController,
	getMyAmbulanceProfileController,
	updateAmbulanceController,
	deleteAmbulanceController,
	updateAmbulanceLocationController,
	updateAmbulanceStatusController,
	getNearbyAmbulancesController,
} from "../controllers/ambulanceController.js";

const ambulanceRouter = Router();

ambulanceRouter.get("/public", getPublicAmbulancesController);
ambulanceRouter.post("/", requireRoles("admin", "hospital"), createAmbulanceController);
ambulanceRouter.get("/", requireRoles("admin", "hospital"), getAllAmbulancesController);
ambulanceRouter.get("/nearby", requireRoles("admin", "hospital", "patient"), getNearbyAmbulancesController);
ambulanceRouter.get("/me", requireRoles("driver"), getMyAmbulanceProfileController);
ambulanceRouter.get("/:id", requireRoles("admin", "hospital"), getAmbulanceByIdController);
ambulanceRouter.put("/:id", requireRoles("admin", "hospital"), updateAmbulanceController);
ambulanceRouter.delete("/:id", requireRoles("admin", "hospital"), deleteAmbulanceController);
ambulanceRouter.put("/:id/location", requireRoles("admin", "hospital", "driver"), updateAmbulanceLocationController);
ambulanceRouter.put("/:id/status", requireRoles("admin", "hospital", "driver"), updateAmbulanceStatusController);

export default ambulanceRouter;
