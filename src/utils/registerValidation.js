const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Digits, spaces, and common phone punctuation only. */
const PHONE_CHARS_RE = /^[\d\s+\-().]+$/;

const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

function phoneDigitCount(phone) {
  return String(phone ?? "").replace(/\D/g, "").length;
}

function isRegisterPhoneValid(phoneNumber) {
  const phone = String(phoneNumber ?? "").trim();
  if (!phone) return true;

  if (!PHONE_CHARS_RE.test(phone)) return false;

  const digits = phoneDigitCount(phone);
  if (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS) return false;

  if (phone.startsWith("+") && digits < 8) return false;

  return true;
}

/**
 * Phone is optional; when provided it must look like a real number.
 * @returns {string[]} empty or one short error
 */
export function validateRegisterPhone(phoneNumber) {
  if (isRegisterPhoneValid(phoneNumber)) return [];
  return ["Enter a correct phone number (e.g. +380 67 123 4567)."];
}

/**
 * Collects all client-side registration issues (does not stop at the first).
 */
export function validateRegisterForm({
  username,
  email,
  phoneNumber,
  password,
  confirmPassword,
}) {
  const errors = [];

  const u = String(username ?? "").trim();
  if (!u) {
    errors.push("Enter a username.");
  } else {
    if (u.length < 3) errors.push("Username must be at least 3 characters.");
    if (u.length > 22) errors.push("Username must be at most 22 characters.");
  }

  const em = String(email ?? "").trim();
  if (!em) {
    errors.push("Enter your email address.");
  } else if (!EMAIL_RE.test(em)) {
    errors.push("Enter a valid email address.");
  }

  errors.push(...validateRegisterPhone(phoneNumber));

  if (!password) {
    errors.push("Enter a password.");
  } else {
    if (password.length < 8) errors.push("Password must be at least 8 characters.");
    if (password.length > 126) errors.push("Password must be at most 126 characters.");
  }

  if (!confirmPassword) {
    errors.push("Confirm your password.");
  } else if (password && confirmPassword !== password) {
    errors.push("Passwords do not match. Type the same password twice.");
  }

  return errors;
}
