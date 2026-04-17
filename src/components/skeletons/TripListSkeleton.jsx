import "./Skeleton.css";

function TripCardSkeleton() {
  return (
    <div className="skeleton-trip-card" aria-hidden="true">
      <div className="skeleton-line skeleton-trip-card__title" />
      <div className="skeleton-line skeleton-trip-card__line" />
      <div className="skeleton-line skeleton-trip-card__line skeleton-trip-card__line--short" />
      <div className="skeleton-line skeleton-trip-card__date" />
    </div>
  );
}

/**
 * @param {{ count?: number; variant?: "home" | "discover" }} props
 */
export default function TripListSkeleton({ count = 6, variant = "home" }) {
  const listClass =
    variant === "home"
      ? "skeleton-trip-list skeleton-trip-list--home"
      : "skeleton-trip-list";
  return (
    <div
      className={listClass}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading trips"
    >
      {Array.from({ length: count }, (_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}
