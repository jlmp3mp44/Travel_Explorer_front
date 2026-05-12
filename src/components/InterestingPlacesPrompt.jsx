import { useEffect, useMemo, useState } from "react";
import "./InterestingPlacesPrompt.css";

/**
 * Modal that walks the user through saved "interesting" places one-by-one and asks
 * "You saved this place — add it to this trip?". Calls `onComplete(acceptedIds: number[])`
 * once every place has been answered (or skipped). Calls `onCancel()` if the user
 * dismisses the modal without finishing.
 *
 * Props:
 *  - matches: Array<{ id, place: { id, title, ... }, cityName, countryName }>
 *  - onComplete: (acceptedPlaceIds: number[]) => void
 *  - onCancel?: () => void
 */
function InterestingPlacesPrompt({ matches, onComplete, onCancel }) {
  const list = useMemo(() => (Array.isArray(matches) ? matches.filter(Boolean) : []), [matches]);
  const [index, setIndex] = useState(0);
  const [accepted, setAccepted] = useState(() => new Set());

  useEffect(() => {
    if (list.length === 0) {
      onComplete?.([]);
    }
  }, [list, onComplete]);

  if (list.length === 0) {
    return null;
  }

  const current = list[index];
  const placeId = current?.place?.id;
  const total = list.length;

  const advance = (acceptIt) => {
    if (placeId != null && acceptIt) {
      const next = new Set(accepted);
      next.add(Number(placeId));
      setAccepted(next);
      if (index + 1 >= total) {
        onComplete?.(Array.from(next));
        return;
      }
      setIndex(index + 1);
      return;
    }
    if (index + 1 >= total) {
      onComplete?.(Array.from(accepted));
      return;
    }
    setIndex(index + 1);
  };

  const handleSkipAll = () => {
    onComplete?.(Array.from(accepted));
  };

  return (
    <div className="ipp-overlay" role="dialog" aria-modal="true" aria-labelledby="ipp-title">
      <div className="ipp-modal">
        <header className="ipp-header">
          <h2 id="ipp-title" className="ipp-title">
            Add a saved place to this trip?
          </h2>
          <p className="ipp-progress">
            {index + 1} of {total}
          </p>
        </header>

        <div className="ipp-body">
          <p className="ipp-prompt">You saved this place. Do you want to add it to this trip?</p>

          <div className="ipp-place-card">
            {current?.place?.title ? (
              <h3 className="ipp-place-title">{current.place.title}</h3>
            ) : (
              <h3 className="ipp-place-title">(unnamed place)</h3>
            )}
            {(current?.cityName || current?.countryName) && (
              <p className="ipp-place-meta">
                {[current.cityName, current.countryName].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        <footer className="ipp-actions">
          <button
            type="button"
            className="ipp-btn ipp-btn--ghost"
            onClick={() => advance(false)}
          >
            Skip
          </button>
          <button
            type="button"
            className="ipp-btn ipp-btn--primary"
            onClick={() => advance(true)}
          >
            Yes, add it
          </button>
        </footer>

        <div className="ipp-secondary-actions">
          <button type="button" className="ipp-link" onClick={handleSkipAll}>
            Skip all remaining
          </button>
          {onCancel && (
            <button type="button" className="ipp-link" onClick={onCancel}>
              Cancel trip creation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InterestingPlacesPrompt;
