import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import path from 'path';

export default defineConfig(() => ({
  cacheDir: 'node_modules/.vite/apps/platform',
  server: {
    port: 4300,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), nxCopyAssetsPlugin(['*.md'])],
  css: {
    postcss: path.resolve(__dirname, './postcss.config.cjs'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@company-web/shared/ui': path.resolve(__dirname, '../../libs/shared/ui/src'),
      '@company-web/shared/utils': path.resolve(__dirname, '../../libs/shared/utils/src'),
      '@company-web/shared/types': path.resolve(__dirname, '../../libs/shared/types/src'),
      '@company-web/shared/data-access': path.resolve(__dirname, '../../libs/shared/data-access/src'),
    },
  },
  build: {
    outDir: '../../dist/apps/platform',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Third-party code in its own long-cached files; app code stays small.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Only libraries that do not import React get their own file; anything
          // React-based stays with React so it never loads before React does.
          if (/@supabase/.test(id)) return 'vendor-supabase';
          if (/date-fns|\/zod\//.test(id)) return 'vendor-utils';
          return 'vendor';
        },
      },
    },
  },
}));
