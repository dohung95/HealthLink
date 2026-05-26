import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 63527, // Cổng frontend
        open: false,
    },
    define: {
    global: 'window',
  },
});
