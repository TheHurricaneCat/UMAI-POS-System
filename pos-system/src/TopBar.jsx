import React, { useState, useRef, useEffect } from 'react';
import './TopBar.css';
import person_icon from './account-components/person.png';
import { useNavigate } from 'react-router-dom';

const TopBar = ({ user }) => {
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
          <img src={person_icon} alt="menu" className="topbar-menu-icon" />
        </button>
        {menuOpen && (
          <div className="topbar-dropdown">
            <button className="topbar-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/app'); }}>Go to App</button>
            <button className="topbar-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/backup-manager'); }}>Database Backup</button>
          </div>
        )}
        <span className="topbar-title">session viewer</span>
      </div>
      <div className="topbar-right">
        <span className="topbar-role">{user?.role?.toUpperCase() || 'ADMIN'}</span>
        <span className="topbar-avatar"></span>
      </div>
    </header>
  );
};

export default TopBar;
