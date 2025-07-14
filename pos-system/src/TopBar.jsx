import React, { useState, useRef, useEffect } from 'react';
import './TopBar.css';
import news_feed from './account-components/News_Feed.png';
import person_icon from './account-components/person.png';
import { useNavigate } from 'react-router-dom';

const TopBar = ({
  username = '',
  userRole = '',
  handleEndSession,
  handleStartSession,
  saveExcelFile,
  handleClockOut,
  handleLogOut,
  handleShowStatistics,
  pageTitle = ''
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left" ref={menuRef}>
        <button className="topbar-menu-btn" onClick={() => setMenuOpen((v) => !v)}>
          <img src={news_feed} alt="menu" className="topbar-menu-icon" />
        </button>
        {menuOpen && (
          <div className="topbar-dropdown">
            <button className="topbar-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/app'); }}>Go to App</button>
            <button className="topbar-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/product-manager'); }}>Product Manager</button>
            <button className="topbar-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/transaction-viewer'); }}>Transaction Viewer</button>
            <button className="topbar-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/statistics'); }}>Statistics</button>
            <button className="topbar-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/session-viewer'); }}>Session Viewer</button>
            <button className="topbar-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/backup-manager'); }}>Database Backup</button>
          </div>
        )}
        <span className="topbar-title">{pageTitle}</span>
      </div>
      <div className="topbar-right">
        <span className="topbar-role user-info">
          {username || 'User'}
          <img src={person_icon} alt="user" className="user-info-icon" />
        </span>
      </div>
    </header>
  );
};

export default TopBar;
