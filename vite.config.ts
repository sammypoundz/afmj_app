import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/dev/",
  server: {
    proxy: {
      '/api': {
        target: 'https://afmjonline.com',
        changeOrigin: true,
        // Increase timeout to 60 seconds (default is often 30s)
        timeout: 60000,           // in milliseconds
        proxyTimeout: 60000,      // additional for some environments
        // Optional: log proxy events for debugging (uncomment if needed)
        // configure: (proxy) => {
        //   proxy.on('error', (err) => console.log('proxy error', err));
        //   proxy.on('proxyReq', (_, req) => console.log('Sending Request:', req.method, req.url));
        //   proxy.on('proxyRes', (_, res) => console.log('Received Response:', res.statusCode));
        // }
      }
    }
  }
});