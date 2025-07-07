import React, { useState, useEffect } from 'react';
import { useExcelData } from '../context/ExcelDataContext';
import './InventoryStatusIndicator.module.css';

function InventoryStatusIndicator() {
  const { products, ingredients, modifiers, loading, error } = useExcelData();
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Calculate low stock items
    const allItems = [
      ...products.map(item => ({ ...item, type: 'Product' })),
      ...ingredients.map(item => ({ ...item, type: 'Ingredient' })),
      ...modifiers.map(item => ({ ...item, type: 'Modifier' }))
    ];

    const lowStock = allItems.filter(item => {
      const stock = item.stockNumber || 0;
      return stock <= 30; // Consider low stock if 30 or less
    }).sort((a, b) => (a.stockNumber || 0) - (b.stockNumber || 0));

    setLowStockItems(lowStock);
  }, [products, ingredients, modifiers]);

  const getStatusColor = (stockNumber) => {
    if (stockNumber <= 10) return '#ef4444'; // Red for critical
    if (stockNumber <= 30) return '#f59e0b'; // Orange for low
    return '#10b981'; // Green for good
  };

  const getStatusText = (stockNumber) => {
    if (stockNumber <= 10) return 'Critical';
    if (stockNumber <= 30) return 'Low';
    return 'Good';
  };

  if (loading) {
    return (
      <div className="inventory-status-loading">
        <div className="loading-spinner"></div>
        <span>Loading inventory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventory-status-error">
        <span>⚠️ Inventory Error</span>
      </div>
    );
  }

  const criticalItems = lowStockItems.filter(item => (item.stockNumber || 0) <= 10);
  const lowItems = lowStockItems.filter(item => (item.stockNumber || 0) > 10 && (item.stockNumber || 0) <= 30);

  return (
    <div className="inventory-status-container">
      <div 
        className="inventory-status-header"
        onClick={() => setShowDetails(!showDetails)}
        style={{ cursor: 'pointer' }}
      >
        <div className="status-indicators">
          {criticalItems.length > 0 && (
            <span className="status-badge critical">
              {criticalItems.length} Critical
            </span>
          )}
          {lowItems.length > 0 && (
            <span className="status-badge low">
              {lowItems.length} Low
            </span>
          )}
          {lowStockItems.length === 0 && (
            <span className="status-badge good">
              Stock OK
            </span>
          )}
        </div>
        <span className="toggle-icon">
          {showDetails ? '▼' : '▶'}
        </span>
      </div>

      {showDetails && lowStockItems.length > 0 && (
        <div className="inventory-status-details">
          <div className="details-header">
            <h4>Low Stock Items</h4>
            <span className="close-btn" onClick={() => setShowDetails(false)}>×</span>
          </div>
          <div className="items-list">
            {lowStockItems.map((item, index) => (
              <div key={`${item.code}-${index}`} className="stock-item">
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-type">{item.type}</span>
                </div>
                <div className="item-stock">
                  <span 
                    className="stock-number"
                    style={{ color: getStatusColor(item.stockNumber || 0) }}
                  >
                    {item.stockNumber || 0}
                  </span>
                  <span className="stock-status">
                    {getStatusText(item.stockNumber || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryStatusIndicator; 