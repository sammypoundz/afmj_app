import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Online server: https://pkluster.online/api2/*
      '/api2': {
        target: 'https://pkluster.online',
        changeOrigin: true,
        secure: false, // set to true if the cert is valid and you want strict TLS
      },

      // Online server: https://pkluster.online/api/*
      '/api': {
        target: 'https://pkluster.online',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});