import Appointment from '../models/appointmentModel.js';
import { sendSmsReminder, sendWhatsAppReminder } from '../utils/reminderMessaging.js';

const DEFAULT_REMINDER_LEAD_MINUTES = Number(process.env.REMINDER_LEAD_MINUTES || 60);
const DEFAULT_REMINDER_SCAN_INTERVAL_MS = Number(process.env.REMINDER_SCAN_INTERVAL_MS || 60000);

let reminderIntervalHandle = null;

const parseTime = (timeValue) => {
  const raw = String(timeValue || '').trim();

  const twentyFourHourMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    return {
      hour: Number(twentyFourHourMatch[1]),
      minute: Number(twentyFourHourMatch[2]),
    };
  }

  const twelveHourMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hour = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    const meridiem = twelveHourMatch[3].toUpperCase();

    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;

    return { hour, minute };
  }

  return null;
};

const getAppointmentDateTime = (appointment) => {
  const parsedTime = parseTime(appointment.appointmentTime);
  if (!parsedTime) return null;

  const date = new Date(appointment.appointmentDate);
  if (Number.isNaN(date.getTime())) return null;

  date.setHours(parsedTime.hour, parsedTime.minute, 0, 0);
  return date;
};

const buildReminderMessage = (appointment, minutesLeft) => {
  const patientName = appointment.patientId?.name || 'Patient';
  const doctorName = appointment.doctorId?.name || 'your doctor';
  const hospitalName = appointment.doctorId?.hospitalId?.name || 'your hospital';
  const dateText = new Date(appointment.appointmentDate).toLocaleDateString();

  return `Hello ${patientName}, reminder: your appointment with Dr. ${doctorName} at ${hospitalName} is in about ${minutesLeft} minutes (${dateText} ${appointment.appointmentTime}).`;
};

const sendAppointmentReminder = async (appointment) => {
  const patientPhone = appointment.patientId?.contactNumber;
  if (!patientPhone) {
    return {
      smsSent: false,
      whatsappSent: false,
      skipped: true,
      reason: 'Patient phone number missing',
    };
  }

  const appointmentDateTime = getAppointmentDateTime(appointment);
  if (!appointmentDateTime) {
    return {
      smsSent: false,
      whatsappSent: false,
      skipped: true,
      reason: 'Invalid appointment time format',
    };
  }

  const now = new Date();
  const minutesLeft = Math.max(0, Math.round((appointmentDateTime.getTime() - now.getTime()) / 60000));
  const body = buildReminderMessage(appointment, minutesLeft);

  const smsResult = appointment.smsReminderSentAt
    ? { skipped: true, reason: 'SMS already sent' }
    : await sendSmsReminder({ to: patientPhone, body });

  const whatsappResult = appointment.whatsappReminderSentAt
    ? { skipped: true, reason: 'WhatsApp already sent' }
    : await sendWhatsAppReminder({ to: patientPhone, body });

  return {
    smsSent: !smsResult.skipped,
    whatsappSent: !whatsappResult.skipped,
    smsResult,
    whatsappResult,
  };
};

const shouldProcessReminderNow = (appointmentDateTime, leadMinutes) => {
  const now = new Date();
  const reminderWindowStart = new Date(appointmentDateTime.getTime() - leadMinutes * 60000);
  const reminderWindowEnd = appointmentDateTime;
  return now >= reminderWindowStart && now <= reminderWindowEnd;
};

export const processDueAppointmentReminders = async () => {
  const leadMinutes = DEFAULT_REMINDER_LEAD_MINUTES;

  const candidates = await Appointment.find({
    status: 'scheduled',
    $or: [
      { smsReminderSentAt: null },
      { whatsappReminderSentAt: null },
    ],
  })
    .populate('patientId', 'name contactNumber')
    .populate({
      path: 'doctorId',
      select: 'name hospitalId',
      populate: {
        path: 'hospitalId',
        select: 'name',
      },
    })
    .limit(300);

  for (const appointment of candidates) {
    const appointmentDateTime = getAppointmentDateTime(appointment);
    if (!appointmentDateTime) {
      continue;
    }

    if (!shouldProcessReminderNow(appointmentDateTime, leadMinutes)) {
      continue;
    }

    const result = await sendAppointmentReminder(appointment);

    appointment.lastReminderAttemptAt = new Date();
    appointment.reminderLastError = '';

    if (result.smsSent) {
      appointment.smsReminderSentAt = new Date();
    }

    if (result.whatsappSent) {
      appointment.whatsappReminderSentAt = new Date();
    }

    if (!result.smsSent && !result.whatsappSent && (result.smsResult?.reason || result.whatsappResult?.reason)) {
      appointment.reminderLastError = [result.smsResult?.reason, result.whatsappResult?.reason]
        .filter(Boolean)
        .join(' | ');
    }

    await appointment.save();
  }
};

export const sendAppointmentReminderByIdService = async (appointmentId, actorId, actorRole) => {
  const query = actorRole === 'doctor'
    ? { _id: appointmentId, doctorId: actorId }
    : actorRole === 'admin'
      ? { _id: appointmentId }
      : null;

  if (!query) {
    throw new Error('Not authorized to send reminders');
  }

  const appointment = await Appointment.findOne(query)
    .populate('patientId', 'name contactNumber')
    .populate({
      path: 'doctorId',
      select: 'name hospitalId',
      populate: {
        path: 'hospitalId',
        select: 'name',
      },
    });

  if (!appointment) {
    throw new Error('Appointment not found or access denied');
  }

  const result = await sendAppointmentReminder(appointment);

  appointment.lastReminderAttemptAt = new Date();
  appointment.reminderLastError = '';

  if (result.smsSent) {
    appointment.smsReminderSentAt = new Date();
  }

  if (result.whatsappSent) {
    appointment.whatsappReminderSentAt = new Date();
  }

  if (!result.smsSent && !result.whatsappSent) {
    appointment.reminderLastError = [result.smsResult?.reason, result.whatsappResult?.reason]
      .filter(Boolean)
      .join(' | ');
  }

  await appointment.save();

  return {
    message: 'Reminder process completed',
    result,
    appointmentId: appointment._id,
  };
};

export const startReminderScheduler = () => {
  if (reminderIntervalHandle) {
    return;
  }

  reminderIntervalHandle = setInterval(async () => {
    try {
      await processDueAppointmentReminders();
    } catch (error) {
      console.error('Reminder scheduler error:', error?.message || error);
    }
  }, DEFAULT_REMINDER_SCAN_INTERVAL_MS);

  console.log(
    `Reminder scheduler started (lead: ${DEFAULT_REMINDER_LEAD_MINUTES} min, interval: ${DEFAULT_REMINDER_SCAN_INTERVAL_MS} ms)`
  );
};

export const stopReminderScheduler = () => {
  if (!reminderIntervalHandle) {
    return;
  }

  clearInterval(reminderIntervalHandle);
  reminderIntervalHandle = null;
};
