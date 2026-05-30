import {Router} from "express";
import { requireAdmin, requireOwnerOrAdmin, requireRoles } from "../middleware/authMiddleware.js";
import {
	validatePatientPayload,
	validatePatientUpdatePayload,
} from "../middleware/patientMiddleware.js";
import {
	getAllPatientsController,
	getPatientByIdController,
	createPatientController,
	updatePatientController,
	deletePatientController,
	getNearbySupportForPatientController,
} from "../controllers/patientController.js";

const patientRouter = Router();

// GET /patients - Get all patients (admin only)
patientRouter.get("/", requireRoles("admin", "hospital"), getAllPatientsController);

// GET /patients/:id - Get a specific patient by ID
patientRouter.get("/me/nearby-support", requireRoles("patient"), getNearbySupportForPatientController);

// GET /patients/:id - Get a specific patient by ID
patientRouter.get("/:id", requireOwnerOrAdmin("id"), getPatientByIdController);

// POST /patients - Create a new patient
patientRouter.post("/", requireRoles("admin", "hospital"), validatePatientPayload, createPatientController);

// PUT /patients/:id - Update a patient's information
patientRouter.put("/:id", requireRoles("admin", "hospital", "patient"), validatePatientUpdatePayload, updatePatientController);

// DELETE /patients/:id - Delete a patient (admin only)
patientRouter.delete("/:id", requireRoles("admin", "hospital"), deletePatientController);

export default patientRouter;