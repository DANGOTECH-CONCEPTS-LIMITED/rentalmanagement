import { api } from "@/lib/api";

// Documents and photos live behind authenticated endpoints. Browsers cannot send an
// Authorization header from an <img> tag, so instead of leaking the bearer token into the
// URL query string we fetch the bytes with the shared axios instance and hand the UI a
// short-lived object URL.
const cache = new Map<string, Promise<string | null>>();

export function resolveMediaUrl(baseUrl: string | undefined, relativePath?: string | null): string | null {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  if (!baseUrl) return null;
  const base = baseUrl.replace(/\/+$/, "");
  const path = relativePath.replace(/^\/+/, "");
  return `${base}/${path}`;
}

/**
 * Fetches an authenticated image and returns an object URL, or null when the file is
 * missing/forbidden. Repeated calls for the same path reuse the first download.
 */
export function fetchAuthenticatedImageUrl(
  baseUrl: string | undefined,
  relativePath?: string | null,
): Promise<string | null> {
  const url = resolveMediaUrl(baseUrl, relativePath);
  if (!url) return Promise.resolve(null);

  const cached = cache.get(url);
  if (cached) return cached;

  const request = api
    .get<Blob>(url, { responseType: "blob" })
    .then((response) => URL.createObjectURL(response.data))
    .catch(() => null);

  cache.set(url, request);
  return request;
}

/** Drops cached object URLs (e.g. after re-uploading a document). */
export function clearAuthenticatedImageCache(): void {
  cache.clear();
}
