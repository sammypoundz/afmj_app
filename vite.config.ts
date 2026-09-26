import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ---------------------------------------------------------------------
// Vite config — dev proxy to https://pkluster.online
//
// Dev  (npm run dev):
//   App served at http://localhost:5173/dev/
//   /api2/<path>  →  https://pkluster.online/api2/<path>
//   /api/<path>   →  https://pkluster.online/api/<path>
//
// Prod (npm run build):
//   App deployed under /dev/ on afmjonline.com.
//   In prod the app calls https://pkluster.online/api2/* directly (see
//   src/apiConfig.ts) — cross-origin, so pkluster must send CORS headers.
//   The /dev/.htaccess on afmjonline.com only handles SPA routing; the
//   "IfModule mod_rewrite" guard on `api2`/`api` below keeps those paths
//   working if a proxy is ever added there.
//
// Front-end convention (all files use this):
//   const API_LOGIN = `${API_ORIGIN}/api2/login.php`;
//   API_ORIGIN = "" in dev (proxied), "https://pkluster.online" in prod.
//
// NOTE: React Router's `basename` must match `base`:
//   <BrowserRouter basename="/dev">
// ---------------------------------------------------------------------

export default defineConfig({
  plugins: [react()],

  base: '/dev/',

  server: {
    proxy: {
      // /api2/* → https://pkluster.online/api2/*
      // No rewrite. The incoming path already includes /api2 and the
      // target expects the /api2 prefix too.
      '/api2': {
        target: 'https://pkluster.online',
        changeOrigin: true,
        secure: false,
      },

      // /api/* → https://pkluster.online/api/*
      '/api': {
        target: 'https://pkluster.online',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});