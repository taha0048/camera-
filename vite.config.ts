import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'formdata-polyfill/FormData.js': path.resolve(__dirname, './src/mock-formdata-polyfill.js'),
        'formdata-polyfill/esm.min.js': path.resolve(__dirname, './src/mock-formdata-polyfill.js'),
        'formdata-polyfill/formdata.min.js': path.resolve(__dirname, './src/mock-formdata-polyfill.js'),
        'formdata-polyfill': path.resolve(__dirname, './src/mock-formdata-polyfill.js'),
        'node-fetch': path.resolve(__dirname, './src/mock-node-fetch.js'),
      },
    },
    optimizeDeps: {
      exclude: ['formdata-polyfill', 'node-fetch'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
