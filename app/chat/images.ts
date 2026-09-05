/**
 * Turning a pasted or dropped file into something sendable.
 *
 * Screenshots are large — a 4K screen grab is several megabytes of PNG, and
 * base64 adds a third on top. Sending that raw makes the turn slow for no gain:
 * the model reads text in an image at a bounded resolution, so pixels beyond
 * that are cost without benefit.
 *
 * So images are downscaled in the browser before upload. The long edge is capped
 * at 1600px, which comfortably preserves the legibility of error-dialog text
 * while cutting a typical screenshot by an order of magnitude.
 */

/** Long-edge cap. Large enough that dialog text stays readable. */
const MAX_EDGE = 1600;

/** Anything already smaller than this is sent untouched. */
const SKIP_RESIZE_BYTES = 200 * 1024;

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export interface PreparedImage {
  mimeType: string;
  /** Raw base64, no data: prefix — that is what the API expects. */
  data: string;
  /** Object URL for the thumbnail. Revoke when the message is dropped. */
  previewUrl: string;
  bytes: number;
  name: string;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Prepare a file for sending.
 *
 * Returns null for anything that is not an accepted image, so the caller can
 * ignore a stray non-image paste rather than showing an error for it — pasting
 * text and an image together is common.
 */
export async function prepareImage(file: File): Promise<PreparedImage | null> {
  if (!ACCEPTED_TYPES.includes(file.type)) return null;

  // Small enough that resizing would cost more than it saves. GIFs are skipped
  // too: drawing one to a canvas would flatten it to its first frame.
  if (file.size <= SKIP_RESIZE_BYTES || file.type === "image/gif") {
    const dataUrl = await readAsDataUrl(file);
    return {
      mimeType: file.type,
      data: dataUrl.split(",")[1] ?? "",
      previewUrl: URL.createObjectURL(file),
      bytes: file.size,
      name: file.name || "screenshot",
    };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    // No canvas available — send the original rather than failing. The server
    // caps the size, so the worst case is a rejected attachment, not a crash.
    const dataUrl = await readAsDataUrl(file);
    return {
      mimeType: file.type,
      data: dataUrl.split(",")[1] ?? "",
      previewUrl: URL.createObjectURL(file),
      bytes: file.size,
      name: file.name || "screenshot",
    };
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // PNG rather than JPEG. Screenshots are flat colour and sharp text, which JPEG
  // handles badly — its ringing artefacts land exactly on the character edges
  // the model needs to read.
  const dataUrl = canvas.toDataURL("image/png");
  const data = dataUrl.split(",")[1] ?? "";

  return {
    mimeType: "image/png",
    data,
    previewUrl: dataUrl,
    bytes: Math.round((data.length * 3) / 4),
    name: file.name || "screenshot",
  };
}

/** Pull image files out of a paste or drop. */
export function filesFromTransfer(items: DataTransferItemList | FileList | null): File[] {
  if (!items) return [];

  const files: File[] = [];

  if ("length" in items && !("add" in items)) {
    for (const file of Array.from(items as FileList)) {
      if (ACCEPTED_TYPES.includes(file.type)) files.push(file);
    }
    return files;
  }

  for (const item of Array.from(items as DataTransferItemList)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file && ACCEPTED_TYPES.includes(file.type)) files.push(file);
  }

  return files;
}
