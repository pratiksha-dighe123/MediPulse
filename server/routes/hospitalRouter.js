import express from 'express';
import {
  registerHospitalController,
  listAllHospitalsController,
  getHospitalController,
  updateHospitalDetailsController,
  deleteHospitalController,
  approveHospitalController,
  rejectHospitalController,
  getHospitalStatisticsController,
  getMyHospitalDashboardController,
  getPublicPlatformStatsController,
} from '../controllers/hospitalController.js';
import { verifyToken, requireAdmin, requireRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public: Hospital registration
router.post('/register', registerHospitalController);

// Hospital: Own dashboard
router.get('/me/dashboard', requireRoles('hospital'), getMyHospitalDashboardController);

// Admin: List all hospitals (with filters)
router.get('/admin/all', verifyToken, requireAdmin, listAllHospitalsController);

// Admin: Get hospital statistics
router.get('/admin/stats', verifyToken, requireAdmin, getHospitalStatisticsController);

// Public: List all approved hospitals
router.get('/', listAllHospitalsController);

// Public: Landing page live platform stats
router.get('/public/stats', getPublicPlatformStatsController);

// Public: Get hospital by ID
router.get('/:id', getHospitalController);

// Admin: Update hospital details
router.put('/:id', verifyToken, requireAdmin, updateHospitalDetailsController);

// Admin: Delete hospital
router.delete('/:id', verifyToken, requireAdmin, deleteHospitalController);

// Admin: Approve hospital
router.patch('/:id/approve', verifyToken, requireAdmin, approveHospitalController);

// Admin: Reject hospital
router.patch('/:id/reject', verifyToken, requireAdmin, rejectHospitalController);

export default router;
