import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'  // Changed from BrowserRouter
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
import Statistics from './statistics.jsx'
import Inventory from './inventory-components/Inventory.jsx'
import AccountPage from './AccountPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>  {/* Changed from BrowserRouter */}
       <Routes>
         <Route path="/" element={<Login />} />
         <Route path="/App" element={<App />} />
         <Route path="/statistics" element={<Statistics />} />
         <Route path="/inventory" element={<Inventory />} />
         <Route path="/account" element={<AccountPage />} />
       </Routes>
     </HashRouter>
   </StrictMode>,
)
