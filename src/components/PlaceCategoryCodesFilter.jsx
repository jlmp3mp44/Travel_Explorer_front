import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../config/api";
import { friendlyNetworkError, parseResponseJson } from "../utils/friendlyErrors";
import {
  normalizeListResponse,
  placeCategoryLabel,
  placeCategoryPathKey,
  placeInterestCode,
  placeInterestId,
  placeInterestLabel,
} from "../utils/geoApi";
import "./PlaceCategoryCodesFilter.css";

/**
 * Multi-select Google place type codes (same codes as trip `trip_place_categories`),
 * for Discover-style filtering.
 */
export default function PlaceCategoryCodesFilter({
  selectedCodes,
  onSelectedCodesChange,
  disabled = false,
}) {
  const selectedSet = useMemo(() => new Set(selectedCodes.map(String)), [selectedCodes]);

  const [placeCategories, setPlaceCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set());
  const [interestsByGroup, setInterestsByGroup] = useState({});
  const [groupLoading, setGroupLoading] = useState({});
  const [groupErrors, setGroupErrors] = useState({});
  const loadedGroupsRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setCategoriesLoading(true);
      setCategoriesError("");
      try {
        const res = await fetch(apiUrl("/api/public/place-categories"));
        const data = await parseResponseJson(res);
        if (!res.ok) throw new Error("Could not load categories.");
        const list = normalizeListResponse(data);
        if (!cancelled) setPlaceCategories(list);
      } catch (err) {
        if (!cancelled) {
          setPlaceCategories([]);
          setCategoriesError(friendlyNetworkError(err));
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadInterestsForGroup = async (groupId) => {
    if (loadedGroupsRef.current.has(groupId)) return;
    setGroupLoading((prev) => ({ ...prev, [groupId]: true }));
    setGroupErrors((prev) => ({ ...prev, [groupId]: "" }));
    try {
      const res = await fetch(
        apiUrl(`/api/public/place-categories/groups/${encodeURIComponent(groupId)}`)
      );
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error("Could not load interests.");
      const list = normalizeListResponse(data);
      loadedGroupsRef.current.add(groupId);
      setInterestsByGroup((prev) => ({ ...prev, [groupId]: list }));
    } catch (err) {
      setGroupErrors((prev) => ({
        ...prev,
        [groupId]: friendlyNetworkError(err),
      }));
    } finally {
      setGroupLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const handleToggleGroup = (groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else {
        next.add(groupId);
        loadInterestsForGroup(groupId);
      }
      return next;
    });
  };

  const toggleCodeForItem = (groupId, item) => {
    const code = placeInterestCode(item);
    if (!code) return;
    const next = new Set(selectedSet);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onSelectedCodesChange([...next]);
  };

  const isItemSelected = (groupId, item) => {
    const code = placeInterestCode(item);
    return code ? selectedSet.has(code) : false;
  };

  const sortedPlaceCategories = useMemo(() => {
    return [...placeCategories].sort((a, b) =>
      placeCategoryLabel(a).localeCompare(placeCategoryLabel(b), undefined, { sensitivity: "base" })
    );
  }, [placeCategories]);

  if (categoriesLoading) {
    return <p className="place-cat-filter__hint">Loading categories…</p>;
  }
  if (categoriesError) {
    return (
      <p className="place-cat-filter__error" role="alert">
        {categoriesError}
      </p>
    );
  }

  return (
    <div className={`place-cat-filter ${disabled ? "place-cat-filter--disabled" : ""}`}>
      <p className="place-cat-filter__lead" id="place-cat-filter-desc">
        Open a group and tap types to match trips that include those place categories.
      </p>
      <div className="place-cat-filter__scroll" role="group" aria-describedby="place-cat-filter-desc">
        {sortedPlaceCategories.map((cat) => {
          const gid = placeCategoryPathKey(cat);
          if (!gid) return null;
          const open = expandedGroupIds.has(gid);
          const items = interestsByGroup[gid];
          const gLoading = groupLoading[gid];
          const gErr = groupErrors[gid];

          return (
            <div key={gid} className={`interest-group ${open ? "interest-group--open" : ""}`}>
              <button
                type="button"
                className="interest-group__header"
                onClick={() => handleToggleGroup(gid)}
                aria-expanded={open}
                disabled={disabled}
              >
                <span className="interest-group__title">{placeCategoryLabel(cat)}</span>
                <span className="interest-group__chevron" aria-hidden="true">
                  {open ? "▴" : "▾"}
                </span>
              </button>
              <div className={`interest-group__body-wrap ${open ? "is-open" : ""}`}>
                <div className="interest-group__body-inner">
                  {gLoading && <p className="place-cat-filter__hint">Loading…</p>}
                  {!gLoading && gErr && (
                    <p className="place-cat-filter__error" role="alert">
                      {gErr}
                    </p>
                  )}
                  {!gLoading && !gErr && items && items.length === 0 && (
                    <p className="interest-group__empty">No types in this group.</p>
                  )}
                  {!gLoading && !gErr && items && items.length > 0 && (
                    <div className="interest-group__chips-scroll">
                      <div className="interest-group__chips">
                        {items.map((item, idx) => {
                          const iid = placeInterestId(item);
                          if (!iid) return null;
                          const selected = isItemSelected(gid, item);
                          return (
                            <button
                              key={`${gid}-${iid}-${idx}`}
                              type="button"
                              className={`interest-chip ${selected ? "interest-chip--selected" : ""}`}
                              onClick={() => toggleCodeForItem(gid, item)}
                              disabled={disabled}
                              aria-pressed={selected}
                            >
                              {placeInterestLabel(item)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {selectedCodes.length > 0 && (
        <p className="place-cat-filter__count" aria-live="polite">
          {selectedCodes.length} type{selectedCodes.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}
