import { useState } from "react";
import "./TripPhotoUrl.css";

/**
 * Lazy-loaded trip/place photo from backend `coverPhotoUrl` / `photoUrl`.
 * Falls back to a neutral block on missing URL or load error.
 */
export default function TripPhotoUrl({ url, alt = "", className = "" }) {
  const [broken, setBroken] = useState(false);
  const src = typeof url === "string" ? url.trim() : "";
  const showImg = src !== "" && !broken;
  const rootClass = ["trip-photo-url", showImg ? "trip-photo-url--img" : "trip-photo-url--placeholder", className]
    .filter(Boolean)
    .join(" ");

  if (!showImg) {
    return <div className={rootClass} aria-hidden={!alt} title={alt || undefined} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={rootClass}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}
