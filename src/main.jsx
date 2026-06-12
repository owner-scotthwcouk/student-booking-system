import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import './App.css'
import { inject } from '@vercel/analytics'

inject()
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/auth.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
