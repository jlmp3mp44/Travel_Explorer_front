import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_API_KEY } from "../config/maps";
import { getActivityPlacesForDisplay } from "../utils/tripItinerary";

function trimStr(v) {
  if (v == null) return "";
  const s = String(v).trim();
  return s;
}

/** @param {Record<string, unknown> | null | undefined} trip */
function destinationQuery(trip) {
  if (!trip || typeof trip !== "object") return "";
  const city = trimStr(trip.city);
  const country = trimStr(trip.country);
  if (city && country) return `${city}, ${country}`;
  return city || country || "";
}

/**
 * Ordered geocode queries for itinerary stops (place + region for accuracy).
 * @param {Record<string, unknown> | null | undefined} trip
 * @param {Array<{ activities?: Array<Record<string, unknown>> }>} displayDays
 */
function collectGeocodeQueries(trip, displayDays) {
  const region = destinationQuery(trip);
  const queries = [];
  for (const day of displayDays) {
    for (const act of day.activities || []) {
      for (const p of getActivityPlacesForDisplay(act)) {
        const title = trimStr(p?.title);
        if (!title) continue;
        queries.push(region ? `${title}, ${region}` : title);
      }
    }
  }
  return queries;
}

function geocodeAddress(geocoder, address) {
  return new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        resolve(results[0].geometry.location);
        return;
      }
      resolve(null);
    });
  });
}

const GEO_PAUSE_MS = 120;

/**
 * @param {{ trip: Record<string, unknown> | null; displayDays: Array<unknown> }} props
 */
export default function TripRouteMap({ trip, displayDays }) {
  const containerRef = useRef(null);
  const [ui, setUi] = useState(() => ({ phase: "loading", hint: "" }));

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY?.trim()) return;
    if (import.meta.env.VITE_DISABLE_GOOGLE_API === "true") return;

    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const markers = [];
    let polyline = null;
    let mapInstance = null;

    queueMicrotask(() => {
      if (!cancelled) setUi({ phase: "loading", hint: "" });
    });

    (async () => {
      try {
        setOptions({ key: GOOGLE_MAPS_API_KEY, v: "weekly" });

        const [mapsLib, geoLib, markerLib, coreLib] = await Promise.all([
          importLibrary("maps"),
          importLibrary("geocoding"),
          importLibrary("marker"),
          importLibrary("core"),
        ]);

        if (cancelled) return;

        const geocoder = new geoLib.Geocoder();
        const queries = collectGeocodeQueries(trip, displayDays);
        const fallback = destinationQuery(trip);

        const stops = [];

        for (const q of queries) {
          if (cancelled) return;
          const loc = await geocodeAddress(geocoder, q);
          if (loc) stops.push({ query: q, location: loc });
          await new Promise((r) => setTimeout(r, GEO_PAUSE_MS));
        }

        if (cancelled) return;

        let center = { lat: 50.85, lng: 10.35 };
        let zoom = 5;
        let fallbackLoc = null;

        if (stops.length === 0 && fallback) {
          fallbackLoc = await geocodeAddress(geocoder, fallback);
          if (cancelled) return;
          if (fallbackLoc) {
            center = { lat: fallbackLoc.lat(), lng: fallbackLoc.lng() };
            zoom = 6;
          }
        } else if (stops.length === 1) {
          const loc = stops[0].location;
          center = { lat: loc.lat(), lng: loc.lng() };
          zoom = 12;
        } else if (stops.length > 1) {
          const mid = stops[Math.floor(stops.length / 2)].location;
          center = { lat: mid.lat(), lng: mid.lng() };
          zoom = 11;
        }

        mapInstance = new mapsLib.Map(el, {
          center,
          zoom,
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: false,
        });

        stops.forEach((s, idx) => {
          const m = new markerLib.Marker({
            map: mapInstance,
            position: s.location,
            label: String(idx + 1),
            title: s.query,
          });
          markers.push(m);
        });

        if (stops.length === 0 && fallbackLoc) {
          markers.push(
            new markerLib.Marker({
              map: mapInstance,
              position: fallbackLoc,
              title: fallback,
            })
          );
        }

        const path = stops.map((s) => s.location);
        if (path.length >= 2) {
          polyline = new mapsLib.Polyline({
            path,
            geodesic: true,
            strokeColor: "#667eea",
            strokeOpacity: 0.92,
            strokeWeight: 4,
            map: mapInstance,
          });
          const bounds = new coreLib.LatLngBounds();
          path.forEach((p) => bounds.extend(p));
          mapInstance.fitBounds(bounds, 56);
        }

        if (cancelled) return;
        setUi({ phase: "ready", hint: "" });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setUi({
            phase: "error",
            hint: err instanceof Error ? err.message : "Could not load the map.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      markers.forEach((m) => m.setMap(null));
      if (polyline) polyline.setMap(null);
      polyline = null;
      mapInstance = null;
      el.innerHTML = "";
    };
  }, [trip, displayDays]);

  if (!GOOGLE_MAPS_API_KEY?.trim() || import.meta.env.VITE_DISABLE_GOOGLE_API === "true") {
    return (
      <aside className="trip-map-aside trip-map-aside--error" aria-live="polite">
        <p className="trip-map-error-msg">
          {import.meta.env.VITE_DISABLE_GOOGLE_API === "true"
            ? "Google Maps API is temporarily disabled."
            : "Configure VITE_GOOGLE_MAPS_API_KEY to show the map."}
        </p>
      </aside>
    );
  }

  return (
    <aside className="trip-map-aside trip-map-aside--embed" aria-label="Trip route map">
      <div ref={containerRef} className="trip-route-map" />
      {ui.phase === "loading" && (
        <div className="trip-route-map-overlay" role="status" aria-live="polite">
          <span className="trip-route-map-spinner" aria-hidden="true" />
          <span>Loading map…</span>
        </div>
      )}
      {ui.phase === "error" && (
        <div className="trip-route-map-overlay trip-route-map-overlay--error" role="alert">
          {ui.hint || "Map unavailable."}
        </div>
      )}
    </aside>
  );
}
