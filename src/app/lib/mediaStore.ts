const DB_NAME = "deskto-media-v1";
const STORE_NAME = "files";
const DB_VERSION = 3;

function inferMime(name: string, fallback = "") {
  const lower = name.toLowerCase();
  if (fallback && fallback !== "application/octet-stream") return fallback;
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".log") || lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function mediaName(file: string) {
  if (!file || typeof file !== "string") return "";
  const parts = file.split("|||");
  return parts[0] || file;
}

export function mediaMime(file: string) {
  if (!file || typeof file !== "string") return "application/octet-stream";
  const parts = file.split("|||");
  const mime = parts[1];
  if (mime && mime !== "application/octet-stream") return mime;
  return inferMime(mediaName(file), mime);
}

export function mediaRef(file: string) {
  if (!file || typeof file !== "string") return "";
  const parts = file.split("|||");
  return parts[2] || "";
}

export function mediaKind(file: string) {
  if (!file || typeof file !== "string") return "File";
  const mime = mediaMime(file);
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("video/")) return "MP4";
  if (mime.startsWith("image/")) return "Image";
  if (mime === "text/plain") return "TXT";
  return "File";
}

// Check if file has a valid reference (idb:xxx or data:)
export function hasValidRef(file: string) {
  if (!file || typeof file !== "string") return false;
  const ref = mediaRef(file);
  return ref.startsWith("idb:") || ref.startsWith("data:");
}

// Check if file string looks like a valid media file reference
export function isMediaFile(file: string) {
  if (!file || typeof file !== "string") return false;
  // Must have the ||| format
  const parts = file.split("|||");
  if (parts.length >= 2) return true;
  // Or must have a valid extension
  const name = file.toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|pdf|mp4|txt|log)$/.test(name);
}

export async function saveMediaFile(file: File) {
  const id = `media_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  const type = inferMime(file.name, file.type);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id, name: file.name, type, blob: file, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return `${file.name}|||${type}|||idb:${id}`;
}

function dataUrlToBlobUrl(dataUrl: string, mime: string) {
  try {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return "";
  }
}

export async function mediaBlobUrl(file: string): Promise<string> {
  try {
    const ref = mediaRef(file);
    if (!ref) return "";

    // Handle data URLs
    if (ref.startsWith("data:")) {
      return dataUrlToBlobUrl(ref, mediaMime(file));
    }

    // Handle IndexedDB references
    if (!ref.startsWith("idb:")) return "";
    const id = ref.slice(4);
    if (!id) return "";

    const db = await openDb();
    const record = await new Promise<{ blob: Blob; type?: string; name?: string } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();

    if (!record?.blob) return "";

    // Determine correct MIME type
    const mime = record.type || mediaMime(file);
    return URL.createObjectURL(record.blob);
  } catch (error) {
    console.error("Error getting blob URL:", error);
    return "";
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[ch] || ch));
}

function writeMediaWindow(targetWindow: Window, name: string, mime: string, blobUrl: string) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(blobUrl);
  const body =
    mime === "application/pdf"
      ? `<iframe title="${safeName}" src="${safeUrl}" style="width:100%;height:100%;border:0;"></iframe>`
      : mime.startsWith("video/")
        ? `<video src="${safeUrl}" controls autoplay style="max-width:100%;max-height:100%;background:#000;"></video>`
        : mime.startsWith("image/")
          ? `<img src="${safeUrl}" alt="${safeName}" style="max-width:100%;max-height:100%;object-fit:contain;" />`
          : `<a href="${safeUrl}" download="${safeName}" style="color:#ff2d55;font:16px sans-serif;">Download ${safeName}</a>`;

  targetWindow.document.open();
  targetWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${safeName}</title>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #050505; color: #fff; }
      body { display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>${body}</body>
</html>`);
  targetWindow.document.close();
}

function writeMediaMessage(targetWindow: Window | null | undefined, message: string) {
  if (!targetWindow || targetWindow.closed) return;
  targetWindow.document.open();
  targetWindow.document.write(`<!doctype html><html><body style="margin:0;background:#050505;color:#fff;font:16px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">${escapeHtml(message)}</body></html>`);
  targetWindow.document.close();
}

function downloadBlobUrl(blobUrl: string, name: string) {
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Open media file in a new window or download. Pass a pre-opened window from the click handler to avoid popup blocking.
export async function openMediaFile(file: string, targetWindow?: Window | null): Promise<boolean> {
  try {
    const name = mediaName(file);
    const mime = mediaMime(file);
    const ref = mediaRef(file);

    writeMediaMessage(targetWindow, `Opening ${name}...`);

    // Check if we have a valid reference
    if (!ref) {
      console.warn("No reference found for file:", name);
      writeMediaMessage(targetWindow, `${name} is missing its stored file reference. Please re-upload it.`);
      return false;
    }

    // Try to get blob URL
    let blobUrl: string | null = null;

    if (ref.startsWith("data:")) {
      blobUrl = dataUrlToBlobUrl(ref, mime);
    } else if (ref.startsWith("idb:")) {
      blobUrl = await mediaBlobUrl(file);
    }

    if (!blobUrl) {
      console.warn("Could not create blob URL for:", name);
      writeMediaMessage(targetWindow, `${name} could not be loaded from browser storage. Please re-upload it.`);
      return false;
    }

    if (targetWindow && !targetWindow.closed) {
      writeMediaWindow(targetWindow, name, mime, blobUrl);
      return true;
    }

    const opened = window.open("", "_blank");
    if (opened && !opened.closed) {
      writeMediaWindow(opened, name, mime, blobUrl);
      return true;
    }

    if (!opened || opened.closed) {
      downloadBlobUrl(blobUrl, name);
    }
    return true;
  } catch (error) {
    console.error("Error opening media file:", error);
    writeMediaMessage(targetWindow, "Could not open this file. Please re-upload it.");
    return false;
  }
}

// Preview function that returns a blob URL for inline display
export async function previewMediaFile(file: string): Promise<string | null> {
  try {
    return await mediaBlobUrl(file);
  } catch {
    return null;
  }
}

// Clean up blob URLs to prevent memory leaks
export function revokeMediaBlobUrl(blobUrl: string) {
  try {
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Ignore errors
  }
}

// Debug function to list all stored media files
export async function listStoredMedia(): Promise<Array<{ id: string; name: string; type: string }>> {
  try {
    const db = await openDb();
    const records = await new Promise<Array<{ id: string; name: string; type: string }>>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result.map(r => ({ id: r.id, name: r.name, type: r.type })));
      request.onerror = () => reject(request.error);
    });
    db.close();
    return records;
  } catch {
    return [];
  }
}
