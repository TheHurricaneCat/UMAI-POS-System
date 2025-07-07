import React, { useState } from 'react';
import styles from './UpdateSupplierEmail.module.css';
import popupStyles from '../global-components/PopUp.module.css';
import { useExcelData } from '../context/ExcelDataContext';

function UpdateSupplierEmail({ open, onClose }) {
  const { ingredients, products } = useExcelData();
  const [toEmail, setToEmail] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [restockList, setRestockList] = useState([]);
  const [touched, setTouched] = useState({ to: false, from: false });
  const [error, setError] = useState({ to: '', from: '' });
  const [addProductId, setAddProductId] = useState('');
  const [addProductQty, setAddProductQty] = useState(1);

  React.useEffect(() => {
    if (open) {
      setRestockList([]); // Start with an empty restock list
      setTouched({ to: false, from: false });
      setError({ to: '', from: '' });
      setToEmail('');
      setFromEmail('');
      setAddProductId('');
      setAddProductQty(1);
    }
  }, [open, ingredients, products]);

  const handleQtyChange = (id, value) => {
    setRestockList(list =>
      list.map(item =>
        item.id === id ? { ...item, requestQty: Math.max(0, Number(value)) } : item
      )
    );
  };

  const validate = () => {
    let valid = true;
    let err = { to: '', from: '' };
    // Email regex for basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!toEmail) {
      err.to = 'Email is Required';
      valid = false;
    } else if (!emailRegex.test(toEmail)) {
      err.to = 'Invalid email format';
      valid = false;
    }
    if (!fromEmail) {
      err.from = 'Email is Required';
      valid = false;
    } else if (!emailRegex.test(fromEmail)) {
      err.from = 'Invalid email format';
      valid = false;
    }
    setError(err);
    return valid;
  };

  const handleBlur = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
    validate();
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!addProductId || !addProductQty || isNaN(addProductQty) || Number(addProductQty) < 1) return;
    // Find in products or ingredients
    const all = [...products, ...ingredients];
    const found = all.find(item => item.id === addProductId);
    if (!found) return;
    setRestockList(list => {
      const exists = list.find(i => i.id === found.id);
      if (exists) {
        // Update the quantity to the new value
        return list.map(i => i.id === found.id ? { ...i, requestQty: Number(addProductQty) } : i);
      } else {
        return [...list, { ...found, requestQty: Number(addProductQty), type: found.type || (products.find(p => p.id === found.id) ? 'product' : 'ingredient') }];
      }
    });
    setAddProductId('');
    setAddProductQty(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    // Here you would send the email or trigger backend logic
    alert(
      `Email sent!\nTo: ${toEmail}\nFrom: ${fromEmail}\nRestock: ` +
        restockList.filter(i => i.requestQty > 0).map(i => `${i.name}: ${i.requestQty}`).join(', ')
    );
    onClose();
  };

  if (!open) return null;

  // For add menu, show all products/ingredients not already in restockList
  const allOptions = [
    ...products.map(p => ({ ...p, type: 'product' })),
    ...ingredients.map(i => ({ ...i, type: 'ingredient' })),
  ];
  const availableOptions = allOptions.filter(opt => !restockList.some(r => r.id === opt.id));

  return (
    <div className={popupStyles.popup}>
      <div className={popupStyles.popupInner} style={{ maxWidth: 600 }}>
        <h1>Update Supplier - Restock Request</h1>
        <form className={styles.updateSupplierForm} onSubmit={handleSubmit}>
          <div className={styles.updateSupplierField}>
            <label>To (Supplier Email):<br />
              <input
                type="email"
                value={toEmail}
                onChange={e => { setToEmail(e.target.value); if (touched.to) validate(); }}
                onBlur={() => handleBlur('to')}
                className={styles.updateSupplierInput}
                aria-label="To Email Address"
              />
            </label>
            <span className={styles.errorText} style={{ minHeight: 18, display: 'block' }}>{(touched.to && error.to) ? error.to : ''}</span>
          </div>
          <div className={styles.updateSupplierField}>
            <label>From (Your Email):<br />
              <input
                type="email"
                value={fromEmail}
                onChange={e => { setFromEmail(e.target.value); if (touched.from) validate(); }}
                onBlur={() => handleBlur('from')}
                className={styles.updateSupplierInput}
                aria-label="From Email Address"
              />
            </label>
            <span className={styles.errorText} style={{ minHeight: 18, display: 'block' }}>{(touched.from && error.from) ? error.from : ''}</span>
          </div>
          <div className={styles.updateSupplierField}>
            <span className={styles.updateSupplierRestockLabel}>Restock Items (edit quantity):</span>
            <div className={styles.updateSupplierRestockList} style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8, background: 'var(--brown-100)' }}>
              {restockList.length === 0 ? (
                <div>No items selected for restocking.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', fontWeight: 600, padding: '4px 16px', borderBottom: '1px solid var(--brown-200)', background: 'var(--brown-200)' }}>
                    <span style={{ flex: 1 }}>Product</span>
                    <span style={{ width: 60, textAlign: 'center' }}>Qty</span>
                    <span style={{ width: 32 }}></span>
                  </div>
                  {restockList.map(item => (
                    <div key={item.id} className={styles.updateSupplierRestockItem}>
                      <span style={{ flex: 1 }}>{item.name} (Current: {item.stockNumber})</span>
                      <input
                        type="number"
                        min="1"
                        value={item.requestQty}
                        onChange={e => handleQtyChange(item.id, e.target.value)}
                        className={styles.updateSupplierQtyInput}
                        style={{ width: 60, marginLeft: 8, textAlign: 'center' }}
                      />
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => setRestockList(list => list.filter(i => i.id !== item.id))}
                        aria-label="Delete"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className={styles.updateSupplierAddRow}>
              <select
                value={addProductId}
                onChange={e => setAddProductId(e.target.value)}
                className={styles.updateSupplierInput}
                style={{ flex: 2 }}
              >
                <option value="">Add product/ingredient...</option>
                {availableOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} (Current: {opt.stockNumber})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={addProductQty}
                onChange={e => setAddProductQty(e.target.value)}
                className={styles.updateSupplierQtyInput}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className={popupStyles.saveButton}
                style={{ flex: '0 0 90px', minWidth: 90, maxWidth: 110, height: 40, fontSize: 16 }}
                onClick={handleAddProduct}
              >
                Add
              </button>
            </div>
          </div>
          <div className={styles.updateSupplierButtonRow}>
            <button type="button" className={popupStyles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={popupStyles.saveButton}>Send Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateSupplierEmail;
