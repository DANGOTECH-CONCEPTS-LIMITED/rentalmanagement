/**
 * Builds a URL for the API's absolute routes (e.g. `/api/AdminBillPayments`).
 *
 * `VITE_API_BASE_URL` may or may not include an `/api` suffix, while these controller
 * routes are declared as absolute templates under `/api/...`. Stripping any suffix and
 * appending the route verbatim keeps the two consistent.
 */
export function buildApiEndpoint(baseUrl: string | undefined | null, path: string): string {
  const root = (baseUrl ?? "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api(?:\/.*)?$/i, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${root}${normalizedPath}`;
}
