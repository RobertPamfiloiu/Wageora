import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// In production, forward all /api/* fetch calls to the backend service
const _API_BASE = import.meta.env.VITE_BACKEND_URL ?? ''
if (_API_BASE) {
  const _origFetch = window.fetch.bind(window)
  window.fetch = (url, opts) => {
    if (typeof url === 'string' && url.startsWith('/api')) {
      url = _API_BASE + url
    }
    return _origFetch(url, opts)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
