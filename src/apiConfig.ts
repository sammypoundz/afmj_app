// Single source of truth for the backend API origin.
// - In dev, Vite proxies "/api2/..." to the backend, so we use a relative base.
// - In production builds, the backend is hosted on a different server,
//   so we use its full URL.
export const API_ORIGIN = import.meta.env.DEV
  ? "" // relative - handled by the Vite dev proxy
  : (import.meta.env.VITE_API_ORIGIN ?? "https://pkluster.online/api2/");
