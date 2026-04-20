import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './App.tsx';
import './index.css';

// Global API configuration
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';
axios.defaults.headers.common['X-API-Token'] = import.meta.env.VITE_API_TOKEN || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
