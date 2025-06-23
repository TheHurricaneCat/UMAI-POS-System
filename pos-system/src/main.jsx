import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
/* import Statistics from './statistics.jsx' */
import Inventory from './inventory-components/Inventory.jsx'
import SessionViewer from './SessionViewer.jsx'
import ProductManager from './ProductManager.jsx'
import TransactionViewer from './TransactionViewer.jsx'
import Statistics from '../statistics-component/Statistics.jsx';
import BackupManager from './BackupManager.jsx'

import { UserProvider } from './UserContext';

const startApp = () => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <UserProvider>
        <HashRouter>  {/* Changed from BrowserRouter */}
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/session-viewer" element={<SessionViewer />} />
            <Route path="/transaction-viewer" element={<TransactionViewer />} />
            <Route path="/product-manager" element={<ProductManager />} />
             <Route path="/backup-manager" element={<BackupManager />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/app" element={<App />} />
            <Route path="/inventory" element={<Inventory />} />
          </Routes>
        </HashRouter>
       </UserProvider>
     </StrictMode>,
  )
};

if (window.cordova) {
  // Wait for deviceready event before starting React app
  document.addEventListener('deviceready', startApp, false);
} else {
  // Start immediately for browser/development
  startApp();
}


