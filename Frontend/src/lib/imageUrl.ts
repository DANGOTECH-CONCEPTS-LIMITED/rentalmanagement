/**
 * Converts a server-stored file path (Windows absolute path or plain filename)
 * to a fully-qualified URL for display.
 *
 * Server returns paths like:
 *   "C:\\propertymanagementfiles\\uploads\\uuid.png"
 * We extract the filename and prepend the API base + uploads segment.
 *
 * If the backend changes the serving endpoint, update IMAGE_BASE_URL here only.
 */
const IMAGE_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/uploads`;

export function getImageUrl(filePath: string | null | undefined): string {
  if (!filePath) return "";
  const filename = filePath.split(/[/\\]/).pop()?.trim();
  if (!filename) return "";
  return `${IMAGE_BASE_URL}/${filename}`;
}
