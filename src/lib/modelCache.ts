/**
 * Fetches a same-origin static asset with byte-level progress, caching it
 * in the browser's Cache Storage so a repeat visit reuses the cached copy
 * instead of re-downloading. Falls back to a plain (uncached, but still
 * progress-reporting) fetch if the Cache API isn't available.
 */

const CACHE_NAME = "aiconvertly-ai-models-v1";

async function openCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

async function readWithProgress(
  response: Response,
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
  fallbackTotalBytes = 0
): Promise<ArrayBuffer> {
  // Chrome's fetch() doesn't expose a Content-Length for `application/wasm`
  // responses at all (confirmed directly -- header.get() returns null even
  // though the server sends it; curl sees it fine), so callers fetching a
  // known static asset can pass its real size as a fallback rather than
  // this collapsing to 0 and corrupting the combined progress percentage.
  const headerTotal = Number(response.headers.get("content-length") ?? 0);
  const totalBytes = headerTotal > 0 ? headerTotal : fallbackTotalBytes;
  if (!response.body || !onProgress) {
    return response.arrayBuffer();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loadedBytes += value.byteLength;
    onProgress(loadedBytes, totalBytes);
  }

  const merged = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

export async function cachedFetchArrayBuffer(
  url: string,
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
  signal?: AbortSignal,
  fallbackTotalBytes = 0
): Promise<ArrayBuffer> {
  const cache = await openCache();

  if (cache) {
    const cached = await cache.match(url);
    if (cached) return cached.arrayBuffer();
  }

  // A cancelled fetch rejects `fetch()` itself if aborted before the
  // response arrives, or rejects the in-progress body read below if
  // aborted mid-stream -- either way this genuinely stops the network
  // transfer, not just the UI that was showing its progress.
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }

  const buffer = await readWithProgress(response, onProgress, fallbackTotalBytes);

  // Cache only after a full, successful read -- caching a `.clone()` of
  // the live response here (reading it concurrently with the loop above)
  // would leave a second, unawaited reader on the same stream that an
  // abort() tears down independently of this function's own try/catch,
  // which surfaced as a spurious "BodyStreamBuffer was aborted" console
  // error on a cancelled download even though nothing was actually wrong.
  if (cache) {
    try {
      await cache.put(url, new Response(buffer, { headers: response.headers }));
    } catch {
      // Best-effort: e.g. storage quota exceeded. Enhancement still works,
      // it just won't be cached for next time.
    }
  }

  return buffer;
}

export async function isModelCached(urls: string[]): Promise<boolean> {
  const cache = await openCache();
  if (!cache) return false;
  for (const url of urls) {
    if (!(await cache.match(url))) return false;
  }
  return true;
}
