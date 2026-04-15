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

/** Place category / interest group (GET /api/public/place-categories) */
export function placeCategoryId(c) {
  if (c == null) return "";
  const v = c.id ?? c.categoryId ?? c.placeCategoryId ?? c.groupId;
  return v != null ? String(v) : "";
}

export function placeCategoryLabel(c) {
  if (c == null) return "";
  const label = c.name ?? c.title ?? c.label ?? c.categoryName;
  if (label != null && String(label) !== "") return String(label);
  const id = placeCategoryId(c);
  return id ? String(id) : "";
}

/**
 * Path segment for GET /api/public/place-categories/groups/{key}.
 * Backends often use a string slug (e.g. "culture") while `id` may be numeric — prefer slug/code.
 */
export function placeCategoryPathKey(c) {
  if (c == null) return "";
  const raw =
    c.slug ??
    c.code ??
    c.categoryCode ??
    c.groupKey ??
    c.key;
  if (raw != null && String(raw).trim() !== "") {
    return String(raw).trim();
  }
  const idStr = placeCategoryId(c);
  const name = c.name ?? c.title ?? c.label;
  if (name && /^\d+$/.test(idStr)) {
    return String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  return idStr;
}

/** Inner interest under a group (GET /api/public/place-categories/groups/{groupId}) */
export function placeInterestId(i) {
  if (i == null) return "";
  const v =
    i.id ??
    i.interestId ??
    i.placeId ??
    i.categoryId ??
    i.code ??
    i.placeCode;
  return v != null ? String(v) : "";
}

/**
 * String code for trip POST `categories` (e.g. "museum") — prefer API `code` over numeric `id`.
 */
export function placeInterestCode(i) {
  if (i == null) return "";
  const raw =
    i.code ??
    i.slug ??
    i.placeCode ??
    i.categoryCode ??
    i.placeCategoryCode;
  if (raw != null && String(raw).trim() !== "") return String(raw).trim();
  return placeInterestId(i);
}

export function placeInterestLabel(i) {
  if (i == null) return "";
  const label =
    i.label ??
    i.name ??
    i.title ??
    i.interestName ??
    i.displayName;
  if (label != null && String(label) !== "") return String(label);
  const id = placeInterestId(i);
  return id ? String(id) : "";
}
