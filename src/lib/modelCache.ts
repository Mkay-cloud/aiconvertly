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
  onProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<ArrayBuffer> {
  const totalBytes = Number(response.headers.get("content-length") ?? 0);
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
  onProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<ArrayBuffer> {
  const cache = await openCache();

  if (cache) {
    const cached = await cache.match(url);
    if (cached) return cached.arrayBuffer();
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }

  // Cache the untouched response body before consuming the original for
  // progress-tracked reading -- a Response body can only be read once.
  if (cache) {
    try {
      await cache.put(url, response.clone());
    } catch {
      // Best-effort: e.g. storage quota exceeded. Enhancement still works,
      // it just won't be cached for next time.
    }
  }

  return readWithProgress(response, onProgress);
}

export async function isModelCached(urls: string[]): Promise<boolean> {
  const cache = await openCache();
  if (!cache) return false;
  for (const url of urls) {
    if (!(await cache.match(url))) return false;
  }
  return true;
}
