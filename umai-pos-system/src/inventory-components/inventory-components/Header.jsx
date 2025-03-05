import React from 'react';

 const Header = () => {
  return (
  <div className="header" style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '20px',
  }}>
  <button style={{ padding: '10px', fontSize: '16px' }}>Point of Sales</button>
  <button style={{ padding: '10px', fontSize: '16px' }}>Inventory</button>
  <button style={{ padding: '10px', fontSize: '16px' }}>Statistics</button>
  </div>
  );
 };

 export default Header;
