import { Router } from 'express';
import { requireAdmin, requireRoles } from '../middleware/authMiddleware.js';
import {
	validateAppointmentPayload,
	validateAppointmentUpdatePayload,
} from '../middleware/appointmentMiddleware.js';
import {
	getAllAppointmentsController,
	getAppointmentByIdController,
	getMyAppointmentsController,
	createAppointmentController,
	updateAppointmentController,
	deleteAppointmentController,
	recordAppointmentPaymentController,
	createAppointmentRazorpayOrderController,
	verifyAppointmentRazorpayPaymentController,
	sendAppointmentReminderController,
} from '../controllers/appointmentController.js';

const appointmentRouter = Router();

appointmentRouter.get('/', requireAdmin, getAllAppointmentsController);
appointmentRouter.get('/my', requireRoles('admin', 'doctor', 'patient'), getMyAppointmentsController);
appointmentRouter.get('/:id', requireRoles('admin', 'doctor', 'patient'), getAppointmentByIdController);
appointmentRouter.post('/', requireRoles('admin', 'doctor', 'patient'), validateAppointmentPayload, createAppointmentController);
appointmentRouter.post('/:id/payment', requireRoles('admin', 'doctor'), recordAppointmentPaymentController);
appointmentRouter.post('/:id/payment/razorpay/order', requireRoles('admin', 'doctor'), createAppointmentRazorpayOrderController);
appointmentRouter.post('/:id/payment/razorpay/verify', requireRoles('admin', 'doctor'), verifyAppointmentRazorpayPaymentController);
appointmentRouter.post('/:id/reminders/send', requireRoles('admin', 'doctor'), sendAppointmentReminderController);
appointmentRouter.put('/:id', requireRoles('admin', 'doctor', 'patient'), validateAppointmentUpdatePayload, updateAppointmentController);
appointmentRouter.delete('/:id', requireRoles('admin', 'patient'), deleteAppointmentController);

export default appointmentRouter;