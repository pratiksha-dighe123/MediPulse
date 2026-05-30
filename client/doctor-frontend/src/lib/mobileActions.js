const normalizeDialPhone = (phone) => {
  if (!phone) return '';

  const trimmed = String(phone).trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
};

const getTelHref = (phone) => {
  const normalized = normalizeDialPhone(phone);
  return normalized ? `tel:${normalized}` : '';
};

const getSmsHref = (phone, body = '') => {
  const normalized = normalizeDialPhone(phone);
  if (!normalized) return '';

  const encodedBody = encodeURIComponent(body || '');
  return encodedBody ? `sms:${normalized}?body=${encodedBody}` : `sms:${normalized}`;
};

export { normalizeDialPhone, getTelHref, getSmsHref };
