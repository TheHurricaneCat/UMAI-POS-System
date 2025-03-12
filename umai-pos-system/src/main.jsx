import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'  // Changed from BrowserRouter
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
import Statistics from './statistics.jsx'
import Inventory from './inventory-components/Inventory.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
