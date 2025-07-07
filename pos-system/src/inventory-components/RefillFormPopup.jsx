import React, { useState } from 'react';
import styles from './RefillFormPopup.module.css';

function RefillFormPopup({ open, onClose, onSubmit, products, ingredients, modifiers }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [selectedDiscounts, setSelectedDiscounts] = useState([]);

  if (!open) return null;

  // Use index as fallback if code is missing or empty, ensuring uniqueness
  const allItems = [
    ...products.map((item, idx) => ({ ...item, type: 'product', _idx: `product-${idx}` })),
    ...ingredients.map((item, idx) => ({ ...item, type: 'ingredient', _idx: `ingredient-${idx}` })),
    ...modifiers.map((item, idx) => ({ ...item, type: 'modifier', _idx: `modifier-${idx}` }))
  ];

  const getItemKey = (item) => `${item.type}-${item.code && String(item.code).trim() !== '' ? item.code : item._idx}`;

  const handleCheckbox = (key) => {
    setSelectedItems(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const handleQuantity = (key, value) => {
    setQuantities(prev => ({ ...prev, [key]: Math.max(1, Number(value) || 1) }));
  };

  const handleDiscountChange = (discount) => {
    setSelectedDiscounts(prev =>
      prev.includes(discount)
        ? prev.filter(d => d !== discount)
        : [...prev, discount]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const refillList = allItems.filter(item => selectedItems.includes(getItemKey(item))).map(item => ({
      ...item,
      refillAmount: quantities[getItemKey(item)] || 1
    }));
    onSubmit(refillList, selectedDiscounts);
    setSelectedItems([]); // Clear selection after submit
    setQuantities({});   // Optionally clear quantities too
    setSelectedDiscounts([]);
    onClose();
  };

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent}>
        <h2>Refill Inventory</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.tableWrapper}>
            <table className={styles.refillTable}>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Current Stock</th>
                  <th>Refill Amount</th>
                </tr>
              </thead>
              <tbody>
                {allItems.length === 0 && (
                  <tr><td colSpan={5}>No inventory items available.</td></tr>
                )}
                {allItems.map(item => {
                  const key = getItemKey(item);
                  return (
                    <tr key={key} className={selectedItems.includes(key) ? styles.selectedRow : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(key)}
                          onChange={() => handleCheckbox(key)}
                        />
                      </td>
                      <td>{item.name}</td>
                      <td><span className={styles.typeTag}>{item.type}</span></td>
                      <td>{item.stockNumber}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={quantities[key] || 1}
                          onChange={e => handleQuantity(key, e.target.value)}
                          className={styles.quantityInput}
                          disabled={!selectedItems.includes(key)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Discount Section */}
          <div className={styles.discountSection}>
            <div className={styles.discountLabel}>Discounts:</div>
            <label className={styles.discountOption}>
              <input
                type="checkbox"
                checked={selectedDiscounts.includes('PWD')}
                onChange={() => handleDiscountChange('PWD')}
              />
              PWD
            </label>
            <label className={styles.discountOption}>
              <input
                type="checkbox"
                checked={selectedDiscounts.includes('Student Discount')}
                onChange={() => handleDiscountChange('Student Discount')}
              />
              Student Discount
            </label>
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.saveButton}>Refill Selected</button>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RefillFormPopup;
