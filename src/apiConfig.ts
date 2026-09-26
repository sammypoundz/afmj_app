// src/apiConfig.ts
//
// API origin — the base URL WITHOUT the "/api2" segment.
// Callers append "/api2/<endpoint>" themselves, e.g.:
//   `${API_ORIGIN}/api2/login.php`
//   `${API_ORIGIN}/api2/me.php`
//
// Dev:  "" (relative) so the Vite dev proxy forwards /api2/* to pkluster.
// Prod: "https://pkluster.online" — direct cross-origin calls. Apache on
//       afmjonline.com doesn't proxy /api2 (mod_proxy not available/enableable),
//       so pkluster must serve CORS headers (Access-Control-Allow-Origin).
//
// If you later enable an Apache proxy on afmjonline.com, change the prod
// value back to "" (relative, no trailing slash).

export const API_ORIGIN: string = import.meta.env.PROD
  ? "https://pkluster.online"
  : "";