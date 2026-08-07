export {
  authRequestInit,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  extractTokenFromAuthResponse,
} from "../utils/authToken";

/** Message when catalog list requires sign-in (GET /api/public/trips). */
export function catalogAuthRequiredMessage(status) {
  if (status === 401 || status === 403) {
    return "Sign in to browse the trip catalog.";
  }
  return null;
}
