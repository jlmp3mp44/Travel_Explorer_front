/** Normalize list responses: raw array, Spring page, or wrapped `data`. */
export function normalizeListResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.content && Array.isArray(payload.content)) return payload.content;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
}

export function countryId(c) {
  if (c == null) return "";
  const v = c.id ?? c.countryId ?? c.country_id;
  return v != null ? String(v) : "";
}

export function countryLabel(c) {
  if (c == null) return "";
  const label = c.name ?? c.title ?? c.countryName ?? c.country_name ?? c.label;
  if (label != null && String(label) !== "") return String(label);
  const id = countryId(c);
  return id ? String(id) : "";
}

export function cityId(c) {
  if (c == null) return "";
  const v = c.id ?? c.cityId ?? c.city_id;
  return v != null ? String(v) : "";
}

export function cityLabel(c) {
  if (c == null) return "";
  const label = c.name ?? c.title ?? c.cityName ?? c.city_name ?? c.label;
  if (label != null && String(label) !== "") return String(label);
  const id = cityId(c);
  return id ? String(id) : "";
}
