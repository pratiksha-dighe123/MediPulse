import {Router} from "express";
import { requireAdmin, requireRoles } from "../middleware/authMiddleware.js";
import {
	validateDoctorPayload,
	validateDoctorUpdatePayload,
} from "../middleware/doctorMiddleware.js";
import {
	getAllDoctorsController,
	getDoctorByIdController,
	getDoctorsForBookingController,
	createDoctorController,
	updateDoctorController,
	deleteDoctorController,
	approveDoctorController,
	rejectDoctorController,
	listDoctorsByHospitalController,
	listPendingDoctorsController,
	getDoctorStatisticsController,
} from "../controllers/doctorController.js";

const doctorRouter = Router();

// GET /doctors - Get all doctors (admin only)
doctorRouter.get("/", requireRoles("admin", "hospital"), getAllDoctorsController);

// GET /doctors/search?q=... - Search doctors for appointment booking
doctorRouter.get("/search", requireRoles("admin", "doctor", "patient"), getDoctorsForBookingController);

// Admin/Hospital: Get pending doctors
doctorRouter.get("/admin/pending", requireRoles("admin", "hospital"), listPendingDoctorsController);

// Admin: Get doctor statistics
doctorRouter.get("/admin/stats", requireAdmin, getDoctorStatisticsController);

// Admin: Get doctors by hospital
doctorRouter.get("/hospital/:hospitalId", requireAdmin, listDoctorsByHospitalController);

// Hospital: Approve associated doctor
doctorRouter.patch("/:id/approve", requireRoles("hospital"), approveDoctorController);

// Hospital: Reject associated doctor
doctorRouter.patch("/:id/reject", requireRoles("hospital"), rejectDoctorController);

// GET /doctors/:id - Get a specific doctor by ID
doctorRouter.get("/:id", requireRoles("admin", "hospital", "doctor"), getDoctorByIdController);

// POST /doctors - Create a new doctor
doctorRouter.post("/", requireRoles("admin", "hospital"), validateDoctorPayload, createDoctorController);

// PUT /doctors/:id - Update a doctor's information
doctorRouter.put("/:id", requireRoles("admin", "hospital", "doctor"), validateDoctorUpdatePayload, updateDoctorController);

// DELETE /doctors/:id - Delete a doctor (admin only)
doctorRouter.delete("/:id", requireRoles("admin", "hospital"), deleteDoctorController);

export default doctorRouter;