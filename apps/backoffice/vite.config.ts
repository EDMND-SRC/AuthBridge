import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// API URL from environment variable, fallback to localhost for dev
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', { target: '19' }],
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'components': path.resolve(__dirname, './src/components'),
      'pages': path.resolve(__dirname, './src/pages'),
      'hooks': path.resolve(__dirname, './src/hooks'),
      'providers': path.resolve(__dirname, './src/providers'),
      'features': path.resolve(__dirname, './src/features'),
      'lib': path.resolve(__dirname, './src/lib'),
    },
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '3000', 10),
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
        rewrite: (apiPath: string) => apiPath.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    chunkSizeWarningLimit: 600, // Adjusted for Mantine 8 + Refine 4 bundle
    // Vite 7+ uses Rolldown by default for production builds
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mantine-core': ['@mantine/core', '@mantine/hooks'],
          'mantine-extras': ['@mantine/dates', '@mantine/notifications', '@mantine/form'],
          'query-vendor': ['@tanstack/react-query'],
          'refine-core': ['@refinedev/core'],
          'refine-extras': ['@refinedev/react-router-v6', '@refinedev/react-table', '@refinedev/kbar'],
          'casbin-vendor': ['casbin'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector', 'i18next-http-backend'],
        },
      },
    },
  },
});
