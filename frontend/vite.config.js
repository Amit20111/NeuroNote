import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, '..', '');
    var proxy = {
        '/api': {
            target: "http://127.0.0.1:".concat(env.PORT || '5000'),
            changeOrigin: true,
        },
    };
    return {
        envDir: '..',
        plugins: [react()],
        build: {
            outDir: '../dist',
            emptyOutDir: true,
        },
        server: { proxy: proxy },
        preview: { proxy: proxy },
    };
});
