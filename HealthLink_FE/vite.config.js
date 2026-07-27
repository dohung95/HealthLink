import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@api': path.resolve(__dirname, 'src/api'),
            '@hooks': path.resolve(__dirname, 'src/hooks'),
            '@utils': path.resolve(__dirname, 'src/utils'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@pages': path.resolve(__dirname, 'src/pages'),
            '@layouts': path.resolve(__dirname, 'src/layouts'),
            '@services': path.resolve(__dirname, 'src/services'),
            '@context': path.resolve(__dirname, 'src/context'),
            '@': path.resolve(__dirname, 'src'),
        },
    },
    server: {
        port: 63527,
        open: false,
    },
    define: {
        global: 'window',
    },
    test: {
        environment: 'jsdom',
        exclude: [
            '**/node_modules/**',
            '**/*.test.js',
            '**/*.test.mjs',
        ],
    },
});
