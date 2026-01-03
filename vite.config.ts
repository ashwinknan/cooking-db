import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration runs in a Node.js environment. Removing the explicit import 
// of 'process' avoids TypeScript conflicts with browser-oriented type definitions 
// that might be present in the project and ensures the global Node.js 'process' 
// object (which includes the 'cwd()' method) is used.

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to resolve the TypeScript error 'Property cwd does not exist on type Process'
  // which can occur when environment types are not properly detected as Node.js.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_DB_SECRET': JSON.stringify(env.VITE_DB_SECRET),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
    },
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});