import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Handle service worker updates
const updateSW = registerSW({
  onNeedRefresh() {
    // When a new version is available, we force a reload
    // Since we use autoUpdate, this might not be strictly necessary
    // but it's a good safety measure for some browsers
    if (confirm('يتوفر تحديث جديد للتطبيق. هل ترغب في التحديث الآن؟')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App is ready for offline use');
  },
});

// CRITICAL: Handle chunk loading errors which cause white screens
// This happens when the browser tries to load a JS chunk that was deleted/replaced on the server
const handleChunkError = (event: any) => {
  const error = event?.error || event?.reason || event;
  const message = String(error?.message || error || '').toLowerCase();
  
  // Stricter check for chunk mapping errors from Vite/Rollup
  const isChunkError = 
    message.includes('dynamically imported module') ||
    (message.includes('failed to fetch') && message.includes('module')) ||
    (message.includes('loading chunk') && message.includes('failed'));

  // Check if we already reloaded recently to avoid infinite loops
  const lastReload = sessionStorage.getItem('last_chunk_error_reload');
  const now = Date.now();
  if (lastReload && now - parseInt(lastReload) < 10000) {
    console.error('Detected multiple chunk errors in short time, stopping auto-reload.');
    return;
  }

  if (isChunkError) {
    console.warn('Detected chunk loading error, forcing reload to get latest version...', message);
    sessionStorage.setItem('last_chunk_error_reload', now.toString());
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
};

window.addEventListener('error', (event) => handleChunkError(event), true);
window.addEventListener('unhandledrejection', (event) => handleChunkError(event));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
