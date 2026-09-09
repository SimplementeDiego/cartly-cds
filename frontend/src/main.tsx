import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { FeedbackProvider } from './components/FeedbackProvider';
import { CurrencyProvider } from './currency/CurrencyProvider';
import { queryClient } from './lib/queryClient';
import { theme } from './theme';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          <BrowserRouter>
            <FeedbackProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </FeedbackProvider>
          </BrowserRouter>
        </CurrencyProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
