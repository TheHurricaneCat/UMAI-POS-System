import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Login from './Login.jsx';
import Statistics from './statistics.jsx';
import Inventory from './inventory-components/Inventory.jsx';
import AccountPage from './AccountPage.jsx';
import { UserProvider } from './UserContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <HashRouter>  {/* Changed from BrowserRouter */}
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/App" element={<App />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/inventory" element={<Inventory />} />
        </Routes>
      </HashRouter>
    </UserProvider>
  </StrictMode>
);
