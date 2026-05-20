/**
 * Wait for images inside `root` so PDF capture includes photos when possible.
 */
export function waitForImagesInElement(root, perImageTimeoutMs = 12000) {
  if (!root) return Promise.resolve();
  const imgs = [...root.querySelectorAll("img")];
  if (imgs.length === 0) return Promise.resolve();

  return Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => {
            clearTimeout(timer);
            resolve();
          };
          const timer = window.setTimeout(done, perImageTimeoutMs);
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        })
    )
  );
}

export function tripPdfFilename(trip) {
  const id = trip?.id != null ? String(trip.id) : "trip";
  const title = trip?.title ?? trip?.name ?? trip?.cityName ?? "";
  const slug =
    title && String(title).trim()
      ? String(title)
          .trim()
          .slice(0, 48)
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
      : "";
  return slug ? `trip-${id}-${slug}.pdf` : `trip-${id}.pdf`;
}

/**
 * Renders styled DOM (TripPrintDocument) to a PDF file in the browser.
 */
export async function exportTripPdfFromElement(element, { filename = "trip.pdf" } = {}) {
  if (!element) {
    throw new Error("Could not prepare PDF.");
  }

  await waitForImagesInElement(element);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const { default: html2pdf } = await import("html2pdf.js");

  const opt = {
    margin: [12, 12, 12, 12],
    filename,
    image: { type: "jpeg", quality: 0.94 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#fafbfc",
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"], avoid: ".trip-print-day" },
  };

  await html2pdf().set(opt).from(element).save();
}
