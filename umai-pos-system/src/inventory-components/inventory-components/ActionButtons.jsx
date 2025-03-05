import React from 'react';

 const ActionButtons = () => {
  return (
     <div className="action-buttons" style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '20px',
  }}>
    <div>
        <button style={{ backgroundColor: 'yellow', padding: '10px', marginBottom: '5px' }}>Refresh System</button>
        <button style={{ backgroundColor: 'plum', padding: '10px' }}>Update System</button>
  </div>
    <div>
        <button style={{ backgroundColor: 'yellow', padding: '10px', marginBottom: '5px' }}>Call Supplier</button>
        <button style={{ backgroundColor: 'plum', padding: '10px' }}>Update Supplier</button>
  </div>
    <div>
        <button style={{ backgroundColor: 'yellow', padding: '10px', marginBottom: '5px' }}>Print Order Details</button>
        <button style={{ padding: '10px' }}>Rearrange View</button>
  </div>
  </div>
  );
 };

 export default ActionButtons;