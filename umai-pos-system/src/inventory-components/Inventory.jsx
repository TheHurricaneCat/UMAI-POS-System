import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Inventory.css';

function Inventory() {
    const navigate = useNavigate();
    const [stockStatus, setStockStatus] = useState('Normal');
    const [stockDescription, setStockDescription] = useState('All ingredients are at adequate levels');


    return (
        <div className="inventory-container">
          <div className="inventory-header">
            <h1>Inventory Management</h1>
            <div className="button-group">
              <button onClick={() => navigate('/')} className="nav-button pos">POS</button>
              <button onClick={() => navigate('/statistics')} className="nav-button inventory">Statistics</button>
            </div>
          </div>
    
          <div className="inventory-controls">
            <div className="control-group">
              <button className="control-button">Refresh System</button>
              <button className="control-button">Update System</button>
            </div>
            
            <div className="control-group">
              <button className="control-button">Call Supplier</button>
              <button className="control-button">Update Supplier</button>
            </div>
            
            <div className="control-group">
              <button className="control-button">Print Order Details</button>
              <button className="control-button">Rearrange View</button>
            </div>
    
            <div className="stock-status">
              <h3>Stock Status: <span className={`status ${stockStatus.toLowerCase()}`}>{stockStatus}</span></h3>
              <p>{stockDescription}</p>
            </div>
          </div>
    
          <div className="inventory-content-container">
            <div className="main-content-layout">
              <div className="products-ingredients-section">
                <div className="content-section">
                  <h2>Products</h2>
                  <div className="card-grid">
                  <div className="product-card">
                    <h3>Classic Burger</h3>
                    <p>Stock: 50</p>
                    <button>View Details</button>
                  </div>
                  {/* More product cards */}
                  </div>
                </div>

                <div className="content-section">
                    <h2>Ingredients</h2>
                    <div className="card-grid">
                        <div className="ingredient-card">
                        <h3>Burger Buns</h3>
                        <p>Stock: 200 pcs</p>
                        <p>Used in: 5 products</p>
                        </div>
                        {/* More ingredient cards */}
                    </div>
                </div>
            </div>

          <div className="stock-levels-section">
            <h2>Stock Levels</h2>
            <div className="stock-levels-card">
              <h3>Ingredients Status</h3>
              <div className="ingredients-list">
                <div className="ingredient-status">
                  <span>Burger Buns</span>
                  <span className="status-indicator high">High</span>
                </div>
                <div className="ingredient-status">
                  <span>Lettuce</span>
                  <span className="status-indicator medium">Medium</span>
                </div>
                {/* More ingredient statuses */}
              </div>
            </div>
            <div className="stock-levels-buttons">
              <button className="stock-button">Refresh Database</button>
              <button className="stock-button">Sort</button>
            </div>
          </div>
        </div>
      </div>
        </div>
      );
    }

export default Inventory;