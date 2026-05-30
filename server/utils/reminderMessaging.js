import twilio from 'twilio';

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  return twilio(accountSid, authToken);
};

const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  const trimmed = String(phone).trim();

  // Keep leading + for E.164 while stripping other non-digits.
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }

  const digits = trimmed.replace(/\D/g, '');

  // Fallback for Indian numbers if user entered 10 digits.
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length > 10) {
    return `+${digits}`;
  }

  return '';
};

export const sendSmsReminder = async ({ to, body }) => {
  const client = getTwilioClient();
  const from = process.env.TWILIO_SMS_FROM;
  const toPhone = normalizePhoneNumber(to);

  if (!client || !from || !toPhone) {
    return { skipped: true, reason: 'SMS config or destination is missing' };
  }

  const message = await client.messages.create({
    body,
    from,
    to: toPhone,
  });

  return { skipped: false, sid: message.sid };
};

export const sendWhatsAppReminder = async ({ to, body }) => {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const toPhone = normalizePhoneNumber(to);

  if (!client || !from || !toPhone) {
    return { skipped: true, reason: 'WhatsApp config or destination is missing' };
  }

  const message = await client.messages.create({
    body,
    from: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    to: `whatsapp:${toPhone}`,
  });

  return { skipped: false, sid: message.sid };
};
