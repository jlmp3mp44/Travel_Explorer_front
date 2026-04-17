import "./Skeleton.css";

export default function TripDetailsSkeleton() {
  return (
    <div
      className="trip-details-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading trip"
    >
      <div className="trip-details-skeleton__toolbar">
        <div className="skeleton-line trip-details-skeleton__btn" />
        <div className="skeleton-line trip-details-skeleton__btn trip-details-skeleton__btn--wide" />
      </div>
      <div className="trip-details-skeleton__grid">
        <div>
          <div className="skeleton-line trip-details-skeleton__hero-title" />
          <div className="skeleton-line trip-details-skeleton__hero-desc" />
          <div className="skeleton-line trip-details-skeleton__hero-desc trip-details-skeleton__hero-desc--2" />
          <div className="trip-details-skeleton__pills">
            <div className="skeleton-line trip-details-skeleton__pill" />
            <div className="skeleton-line trip-details-skeleton__pill" />
          </div>
          {[0, 1].map((d) => (
            <div key={d} className="trip-details-skeleton__day">
              <div className="trip-details-skeleton__day-head">
                <div className="skeleton-line trip-details-skeleton__badge" />
                <div className="skeleton-line trip-details-skeleton__date" />
              </div>
              <div className="skeleton-line trip-details-skeleton__activity" />
              <div className="skeleton-line trip-details-skeleton__activity" />
            </div>
          ))}
        </div>
        <div className="skeleton-line trip-details-skeleton__map" />
      </div>
    </div>
  );
}
