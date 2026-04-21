import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./TripDeletedFlashBanner.css";

/**
 * Shows a short, non-blocking message after `navigate(..., { state: { tripDeleted: true } })`.
 * Clears router state so refresh doesn’t repeat the message.
 */
export default function TripDeletedFlashBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!location.state?.tripDeleted) return;
    setVisible(true);
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: {} }
    );
  }, [location.state?.tripDeleted, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), 7000);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="trip-deleted-flash" role="status" aria-live="polite">
      <span className="trip-deleted-flash__text">The trip was deleted.</span>
      <button
        type="button"
        className="trip-deleted-flash__dismiss"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
