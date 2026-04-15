/**
 * Turn fetch/network failures into readable copy (never raw "Failed to fetch").
 */
export function friendlyNetworkError(error) {
  const msg = error?.message ?? String(error ?? "");
  if (
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    error?.name === "TypeError"
  ) {
    return "We couldn’t reach the server. Make sure the backend is running. If you open the app as a file or use a custom URL, set VITE_API_BASE_URL in a .env file.";
  }
  if (msg.length > 0 && msg.length < 180 && !msg.includes("TypeError")) {
    return msg;
  }
  return "Something went wrong. Please check your connection and try again.";
}

/** Parse JSON body; never throws. */
export async function parseResponseJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
}

export function friendlyLoginError(status, data) {
  const raw = typeof data?.message === "string" ? data.message : "";
  const lower = raw.toLowerCase();
  if (lower.includes("bad credential") || lower.includes("invalid credential") || status === 401) {
    return "Incorrect username or password. Please try again.";
  }
  if (status === 404 && (lower.includes("credential") || lower.includes("user") || !raw)) {
    return "Incorrect username or password. Please try again.";
  }
  if (status === 403) {
    return "Access denied. Please contact support if this continues.";
  }
  if (status >= 500) {
    return "The server is busy right now. Please try again in a moment.";
  }
  if (raw && raw.length < 200 && !looksLikeTechnicalError(raw)) {
    return raw;
  }
  return "Something went wrong while signing in. Please try again.";
}

export function friendlyRegisterError(status, data) {
  const raw = typeof data?.message === "string" ? data.message : "";
  if (status === 404 || status === 409) {
    if (raw && raw.length < 200 && !looksLikeTechnicalError(raw)) return raw;
    if (status === 409) return "That username or email is already taken. Try another.";
  }
  if (status === 400) {
    if (raw && raw.length < 200 && !looksLikeTechnicalError(raw)) return raw;
    return "Please check your details and try again.";
  }
  if (status >= 500) {
    return "The server is busy right now. Please try again in a moment.";
  }
  if (raw && raw.length < 200 && !looksLikeTechnicalError(raw)) return raw;
  return "We couldn’t complete registration. Please try again.";
}

export function friendlyTripCreateError(status, data) {
  const raw = typeof data?.message === "string" ? data.message : "";
  const fromSpring = pickSpringErrorMessage(data);
  const combined = fromSpring || raw;
  if (status === 400 && combined && combined.length < 280 && !looksLikeTechnicalError(combined)) {
    return combined;
  }
  if (status >= 500) return "The server is busy right now. Please try again in a moment.";
  if (combined && combined.length < 280 && !looksLikeTechnicalError(combined)) return combined;
  return "We couldn’t create your trip. Please try again.";
}

/** Spring Boot / validation often returns `errors` array, `error` string, or `detail`. */
function pickSpringErrorMessage(data) {
  if (data == null || typeof data !== "object") return "";
  const detail = typeof data.detail === "string" ? data.detail : "";
  if (detail && detail.length < 280) return detail;
  const err = typeof data.error === "string" ? data.error : "";
  if (err && err.length < 280 && err !== "Bad Request") return err;
  const errors = data.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (typeof first === "string" && first.length < 280) return first;
    if (first && typeof first.defaultMessage === "string") return first.defaultMessage;
    if (first && typeof first.message === "string") return first.message;
  }
  return "";
}

export function friendlyPublicLoadError(status, resource) {
  if (status === 404) {
    return resource === "trip"
      ? "This trip doesn’t exist or was removed."
      : "Nothing was found.";
  }
  if (status >= 500) {
    return "The server is busy right now. Please try again in a moment.";
  }
  return "We couldn’t load this content. Please try again.";
}

function looksLikeTechnicalError(s) {
  const t = s.toLowerCase();
  return (
    t.includes("exception") ||
    t.includes("stack") ||
    t.includes("nullpointer") ||
    t.includes("sql") ||
    t.includes("constraint")
  );
}
