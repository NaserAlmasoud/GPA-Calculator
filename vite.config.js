import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds ONE self-contained dist/index.html (JS, CSS and fonts inlined),
// so it opens by double-clicking the file and also works on any static host.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { assetsInlineLimit: 100_000_000 },
});
