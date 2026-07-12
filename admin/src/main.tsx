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
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
