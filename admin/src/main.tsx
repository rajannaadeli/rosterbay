import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import '@/lib/leaflet';
import App from './App.tsx';
import { ThemeProvider } from '@/components/theme-provider.tsx';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/query';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* System-preference default, persisted per browser. The class itself is
        stamped before paint by the blocking script in index.html. */}
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
