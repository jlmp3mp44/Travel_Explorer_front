import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { publicTripUrl } from "../api/tripPublic";
import TripPrintDocument from "../components/TripPrintDocument";
import { friendlyNetworkError, friendlyPublicLoadError, parseResponseJson } from "../utils/friendlyErrors";
import { exportTripPdfFromElement, tripPdfFilename } from "../utils/exportTripPdf";
import { unwrapTripPayload } from "../utils/tripItinerary";
import { useAuth } from "../context/AuthContext";
import "./TripPrint.css";

function TripPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const autoPrintDoneRef = useRef(false);
  const documentRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("trip-print-route");
    return () => {
      document.body.classList.remove("trip-print-route");
    };
  }, []);

  useEffect(() => {
    autoPrintDoneRef.current = false;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setLoading(false);
        setLoadError("Missing trip id.");
        return;
      }
      setLoading(true);
      setLoadError("");
      try {
        const res = await fetch(publicTripUrl(id, user?.id), { credentials: "include" });
        const data = await parseResponseJson(res);
        if (!res.ok) {
          if (!cancelled) {
            setTrip(null);
            setLoadError(friendlyPublicLoadError(res.status, "trip"));
          }
          return;
        }
        if (!cancelled) {
          setTrip(unwrapTripPayload(data));
          setLoadError("");
        }
      } catch (e) {
        if (!cancelled) {
          setTrip(null);
          setLoadError(friendlyNetworkError(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (loading || loadError || !trip) return;
    if (searchParams.get("auto") !== "1") return;
    if (autoPrintDoneRef.current) return;
    autoPrintDoneRef.current = true;
    const t = window.setTimeout(() => {
      window.print();
    }, 350);
    return () => window.clearTimeout(t);
  }, [loading, loadError, trip, searchParams]);

  const handleDownloadPdf = async () => {
    if (!trip || !documentRef.current) return;
    setDownloadError("");
    setDownloading(true);
    try {
      await exportTripPdfFromElement(documentRef.current, {
        filename: tripPdfFilename(trip),
      });
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Could not download the PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="trip-print-root">
        <p className="trip-print-status">Loading…</p>
      </div>
    );
  }

  if (loadError || !trip) {
    return (
      <div className="trip-print-root">
        <p className="trip-print-error" role="alert">
          {loadError || "This trip isn’t available."}
        </p>
        <Link to="/" className="trip-print-back">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="trip-print-toolbar no-print">
        <Link to={`/trip/${id}`} className="trip-print-back">
          ← Back to trip
        </Link>
        <button
          type="button"
          className="trip-print-action"
          onClick={() => void handleDownloadPdf()}
          disabled={downloading}
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
        <button type="button" className="trip-print-action trip-print-action--secondary" onClick={() => window.print()}>
          Print
        </button>
      </div>
      {downloadError ? (
        <p className="trip-print-error no-print" role="alert">
          {downloadError}
        </p>
      ) : null}
      <TripPrintDocument ref={documentRef} trip={trip} user={user} forPdfExport />
    </>
  );
}

export default TripPrint;
