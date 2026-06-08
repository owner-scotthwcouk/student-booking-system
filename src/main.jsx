import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import './App.css'
import { inject } from '@vercel/analytics'

inject()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
