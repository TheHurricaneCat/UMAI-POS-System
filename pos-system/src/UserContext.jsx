import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('userRole') || '';
  });
  
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('sessionId') || null;
  });

  useEffect(() => {
    if (userRole) {
      localStorage.setItem('userRole', userRole);
    } else {
      localStorage.removeItem('userRole');
    }
  }, [userRole]);
  
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }, [sessionId]);

  const clearUserContext = () => {
    setUserRole('');
    setSessionId(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('justLoggedIn');
  };

  return (
    <UserContext.Provider value={{ 
      userRole, 
      setUserRole, 
      sessionId, 
      setSessionId,
      clearUserContext 
    }}>
      {children}
    </UserContext.Provider>
  );
};