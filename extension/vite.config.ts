import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  root: resolve(__dirname),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        content: resolve(__dirname, 'src/content.ts'),
        interceptor: resolve(__dirname, 'src/interceptor.ts'),
        background: resolve(__dirname, 'src/background.ts'),
        bridge: resolve(__dirname, 'src/bridge.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') {
            return 'content.js';
          }
          if (chunkInfo.name === 'interceptor') {
            return 'interceptor.js';
          }
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          if (chunkInfo.name === 'bridge') {
            return 'bridge.js';
          }
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  plugins: [
    {
      name: 'copy-manifest-and-icons',
      closeBundle() {
        const manifestSrc = resolve(__dirname, 'manifest.json');
        const manifestDist = resolve(__dirname, 'dist/manifest.json');
        if (fs.existsSync(manifestSrc)) {
          fs.copyFileSync(manifestSrc, manifestDist);
        }
        ['icon16.png', 'icon48.png', 'icon128.png'].forEach((file) => {
          const src = resolve(__dirname, file);
          const dist = resolve(__dirname, 'dist', file);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dist);
          }
        });
      },
    },
  ],
});
