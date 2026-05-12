import { useEffect, useState } from "react";
import {
  deleteInterestingPlace,
  listInterestingPlaces,
  saveInterestingPlace,
} from "../api/interestingPlaces";
import "./InterestingPlaceToggle.css";

/**
 * Small bookmark button for a place card. Shows whether the current user has saved this place
 * to their "interesting" list and toggles save / unsave on click. Tooltip:
 * "I am interested in this place".
 *
 * Props:
 *  - placeId: number (required)
 *  - context: { cityId?: number|string, countryId?: number|string } — used when saving so
 *    the place can later be matched on city or country.
 *  - savedSet: Set<number> | null — optional pre-loaded saved-place ids; when present the
 *    component avoids fetching the full list. Pair with `onChange` so the parent can keep
 *    the set in sync.
 *  - savedIdMap: Map<number, number> | null — optional map of placeId → interestingPlace.id
 *    used to delete without an extra fetch.
 *  - onChange: ({ placeId, saved, savedRecord }) => void — called after each toggle.
 */
function InterestingPlaceToggle({
  placeId,
  context = {},
  savedSet = null,
  savedIdMap = null,
  onChange,
  size = "md",
}) {
  const [saved, setSaved] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (placeId == null) return;
      if (savedSet) {
        const isSaved = savedSet.has(Number(placeId));
        setSaved(isSaved);
        const rid = savedIdMap?.get(Number(placeId));
        setSavedRecordId(rid != null ? rid : null);
        return;
      }
      try {
        const list = await listInterestingPlaces();
        if (cancelled) return;
        const match = list.find((ip) => Number(ip?.place?.id) === Number(placeId));
        setSaved(!!match);
        setSavedRecordId(match?.id ?? null);
      } catch {
        // silent — toggle still works on click
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [placeId, savedSet, savedIdMap]);

  const handleClick = async (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (placeId == null || busy) return;
    setBusy(true);
    setError("");
    try {
      if (saved && savedRecordId != null) {
        await deleteInterestingPlace(savedRecordId);
        setSaved(false);
        setSavedRecordId(null);
        onChange?.({ placeId: Number(placeId), saved: false, savedRecord: null });
      } else if (saved && savedRecordId == null) {
        // Saved per the parent's set, but we don't know the record id — refetch once.
        const list = await listInterestingPlaces();
        const match = list.find((ip) => Number(ip?.place?.id) === Number(placeId));
        if (match?.id != null) {
          await deleteInterestingPlace(match.id);
          setSaved(false);
          setSavedRecordId(null);
          onChange?.({ placeId: Number(placeId), saved: false, savedRecord: null });
        }
      } else {
        const rec = await saveInterestingPlace({
          placeId: Number(placeId),
          cityId: context?.cityId,
          countryId: context?.countryId,
        });
        setSaved(true);
        setSavedRecordId(rec?.id ?? null);
        onChange?.({ placeId: Number(placeId), saved: true, savedRecord: rec });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update saved places.");
    } finally {
      setBusy(false);
    }
  };

  const tooltip = saved
    ? "Saved to your interesting places — click to remove"
    : "I am interested in this place";

  return (
    <button
      type="button"
      className={`interesting-toggle interesting-toggle--${size}${saved ? " is-saved" : ""}`}
      onClick={handleClick}
      disabled={busy}
      title={error || tooltip}
      aria-label={tooltip}
      aria-pressed={saved}
    >
      <span className="interesting-toggle__icon" aria-hidden="true">
        {saved ? "★" : "☆"}
      </span>
    </button>
  );
}

export default InterestingPlaceToggle;
