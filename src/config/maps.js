/**
 * Browser key for Maps JavaScript API. Prefer VITE_GOOGLE_MAPS_API_KEY in .env / .env.local
 * and restrict the key by HTTP referrer in Google Cloud Console.
 */
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "AIzaSyDnFydl04fZsgOvlx36TRfgjxB5GovF4yA";
