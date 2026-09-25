import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ---------------------------------------------------------------------
// Vite config — dev proxy to https://pkluster.online
//
// Dev  (npm run dev):
//   App served at http://localhost:5173/dev/
//   /api2/*  → https://pkluster.online/api2/*
//   /api/*   → https://pkluster.online/api/*
//
// Prod (npm run build):
//   App deployed under /dev/ on the production host.
//   Assets referenced as /dev/assets/...
//
// NOTE: React Router's `basename` must match `base`:
//   <BrowserRouter basename="/dev">
// ---------------------------------------------------------------------

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Dev: serve under /dev/ so Router basename="/dev" matches.
  // Prod: emit asset URLs prefixed with /dev/.
  base: '/dev/',

  server: {
    proxy: {
      // Online server: https://pkluster.online/api2/*
      '/api2': {
        target: 'https://pkluster.online',
        changeOrigin: true,
        secure: false, // set to true if the cert is trusted
      },

      // Online server: https://pkluster.online/api/*
      '/api': {
        target: 'https://pkluster.online',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));