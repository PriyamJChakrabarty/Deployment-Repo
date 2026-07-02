const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL
).replace(/\/$/, "");

export function buildBackendUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_URL}${normalizedPath}`;
}
