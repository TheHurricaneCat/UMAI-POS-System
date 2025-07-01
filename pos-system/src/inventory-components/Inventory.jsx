// --- Refined Inventory.jsx ---
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Inventory.css';
import * as XLSX from 'xlsx';
import { supabase } from '../database/supabase';
import { useExcelData } from '../context/ExcelDataContext';
import RefillFormPopup from './RefillFormPopup';
import UpdateSupplierEmail from './UpdateSupplierEmail';

function Inventory() {
  const navigate = useNavigate();
  const [stockStatus, setStockStatus] = useState('Normal');
  const [stockDescription, setStockDescription] = useState('All ingredients are at adequate levels');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const [sortMode, setSortMode] = useState('name');
  const [excelError, setExcelError] = useState('');
  const [showRefillPopup, setShowRefillPopup] = useState(false);
  const [showUpdateSupplierPopup, setShowUpdateSupplierPopup] = useState(false);

  // Use context for inventory state and actions
  const {
    excelData, setExcelData,
    products, setProducts,
    ingredients, setIngredients,
    modifiers, setModifiers,
    exportToExcel
  } = useExcelData();

  // --- Utility Functions ---
  const getStockStatus = (stockNumber) => {
    if (stockNumber > 70) return 'high';
    if (stockNumber >= 30) return 'medium';
    return 'low';
  };

  const calOverallStockStatus = (ingredients, modifiers) => {
    const allItems = [...ingredients, ...modifiers];
    if (allItems.length === 0) return { status: 'No Data', description: 'No inventory data available' };
    const totalItems = allItems.length;
    const stockLevels = allItems.reduce((acc, item) => {
      if (item.stockNumber > 70) acc.high++;
      else if (item.stockNumber >= 30) acc.medium++;
      else acc.low++;
      return acc;
    }, { high: 0, medium: 0, low: 0 });
    const highPercentage = (stockLevels.high / totalItems) * 100;
    const lowPercentage = (stockLevels.low / totalItems) * 100;
    if (highPercentage >= 70) {
      return { status: 'High', description: 'Stock levels are healthy across most items' };
    } else if (lowPercentage >= 30) {
      return { status: 'Critical', description: `${stockLevels.low} items need immediate attention` };
    } else if (highPercentage >= 40) {
      return { status: 'Medium', description: 'Stock levels are adequate but some items need attention' };
    } else {
      return { status: 'Low', description: 'Many items need restocking soon' };
    }
  };

  useEffect(() => {
    const { status, description } = calOverallStockStatus(ingredients, modifiers);
    setStockStatus(status);
    setStockDescription(description);
  }, [ingredients, modifiers]);

  // --- Excel Parsing ---
  const parseExcelRows = (jsonData) => {
    let products = [];
    let ingredients = [];
    let modifiers = [];
    if (!Array.isArray(jsonData) || jsonData.length < 2) {
      setExcelError('Excel file is empty or not formatted as expected.');
      return { products, ingredients, modifiers };
    }
    const headers = jsonData[0].map(h => String(h).trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const priceIdx = headers.indexOf('price');
    const categoryIdx = headers.indexOf('category');
    const typeIdx = headers.indexOf('type');
    const stockIdx = headers.findIndex(h => h.startsWith('stock'));
    const codeIdx = headers.indexOf('code');
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < 3) continue;
      const item = {
        id: `${row[nameIdx]}-${i}`,
        name: row[nameIdx],
        price: Number(row[priceIdx]) || 0,
        stockNumber: Number(row[stockIdx]) || 0,
        category: row[categoryIdx],
        code: codeIdx !== -1 ? row[codeIdx] : '',
      };
      const type = String(row[typeIdx] || '').toLowerCase();
      if (type === 'product') products.push(item);
      else if (type === 'ingredient') ingredients.push(item);
      else if (type === 'modifier') modifiers.push(item);
    }
    if (products.length === 0 && ingredients.length === 0 && modifiers.length === 0) {
      setExcelError('No products, ingredients, or modifiers found in the Excel file.');
    }
    return { products, ingredients, modifiers };
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setToastMessage('No file selected. Please choose an Excel file.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    // Check file type by extension
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isExcel = validExtensions.some(ext => fileName.endsWith(ext));
    if (!isExcel) {
      setToastMessage('Invalid file type. Please upload an Excel (.xlsx or .xls) file.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        if (sheetNames.length === 0) {
          setToastMessage('No sheets found in Excel file.');
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
          return;
        }
        const worksheet = workbook.Sheets[sheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setExcelData(jsonData); // Save raw Excel data in context
        const { products: parsedProducts, ingredients: parsedIngredients, modifiers: parsedModifiers } = parseExcelRows(jsonData);
        setProducts(parsedProducts);
        setIngredients(parsedIngredients);
        setModifiers(parsedModifiers);
        setToastMessage('Excel file loaded successfully!');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } catch (err) {
        setToastMessage('Failed to parse Excel file. Please check the file format.');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
      e.target.value = '';
    };
    reader.onerror = () => {
      setToastMessage('Error reading the file.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Button Handlers ---
  const handleRefillStocks = () => {
    if (products.length === 0 && ingredients.length === 0 && modifiers.length === 0) {
      setToastMessage('No inventory data to refill.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    setShowRefillPopup(true);
  };

  const handleRefillSubmit = (refillList) => {
    // Update stock for selected items
    let updatedProducts = [...products];
    let updatedIngredients = [...ingredients];
    let updatedModifiers = [...modifiers];
    refillList.forEach(item => {
      if (item.type === 'product') {
        updatedProducts = updatedProducts.map(p => p.code === item.code ? { ...p, stockNumber: p.stockNumber + item.refillAmount } : p);
      } else if (item.type === 'ingredient') {
        updatedIngredients = updatedIngredients.map(i => i.code === item.code ? { ...i, stockNumber: i.stockNumber + item.refillAmount } : i);
      } else if (item.type === 'modifier') {
        updatedModifiers = updatedModifiers.map(m => m.code === item.code ? { ...m, stockNumber: m.stockNumber + item.refillAmount } : m);
      }
    });
    setProducts(updatedProducts);
    setIngredients(updatedIngredients);
    setModifiers(updatedModifiers);
    setToastMessage('Selected items refilled successfully!');
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleUpdateSystem = () => {
    setToastMessage('Please select an Excel file to update the system.');
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    document.getElementById('excel-upload-input')?.click();
  };

  /*
  const handleCallSupplier = () => {
    setToastMessage('Supplier has been contacted! (Demo)');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };
  */

  const handleUpdateSupplier = () => {
    if (products.length === 0 && ingredients.length === 0) {
      setToastMessage('No products or ingredients in inventory. Please upload inventory data first.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    setShowUpdateSupplierPopup(true);
  };

  const handlePrintOrderDetails = () => window.print();

  // Bubble sort for rearrange view by stock values
  const handleRearrangeView = () => {
    // Toggle between ascending and descending
    setSortMode(prev => prev === 'stock-desc' ? 'stock-asc' : 'stock-desc');
    // Bubble sort for all inventory arrays
    const bubbleSort = (arr, asc = true) => {
      let sorted = [...arr];
      for (let i = 0; i < sorted.length - 1; i++) {
        for (let j = 0; j < sorted.length - i - 1; j++) {
          if (asc ? sorted[j].stockNumber > sorted[j + 1].stockNumber : sorted[j].stockNumber < sorted[j + 1].stockNumber) {
            [sorted[j], sorted[j + 1]] = [sorted[j + 1], sorted[j]];
          }
        }
      }
      return sorted;
    };
    if (sortMode === 'stock-desc') {
      setProducts(bubbleSort(products, false));
      setIngredients(bubbleSort(ingredients, false));
      setModifiers(bubbleSort(modifiers, false));
    } else {
      setProducts(bubbleSort(products, true));
      setIngredients(bubbleSort(ingredients, true));
      setModifiers(bubbleSort(modifiers, true));
    }
  };

  // --- Export to Excel with feedback ---
  const handleExportToExcel = () => {
    // Show error if no inventory data exists
    if ((products.length === 0 && ingredients.length === 0 && modifiers.length === 0) || !excelData || !Array.isArray(excelData) || excelData.length === 0) {
      setToastMessage('No inventory data to export. Please upload an Excel file and ensure inventory is loaded.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    // Check for valid headers (first row should have at least 2 columns and contain "name" and "stock")
    const headers = excelData[0] || [];
    const hasName = headers.some(h => String(h).toLowerCase() === 'name');
    const hasStock = headers.some(h => String(h).toLowerCase().includes('stock'));
    if (!hasName || !hasStock) {
      setToastMessage('The loaded file is not a valid inventory Excel file. Please upload a correct file.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    exportToExcel();
    setToastMessage('Exported to Excel successfully!');
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // --- Sorting ---
  const getSorted = (arr) => arr; // No auto-sorting, handled by bubble sort

  // --- Render ---
  const sortedProducts = getSorted(products);
  const sortedIngredients = getSorted(ingredients);
  const sortedModifiers = getSorted(modifiers);
  return (
    <div className="inventory-horizontal-root">
      <nav className="inventory-navbar">
        <button className="nav-btn" onClick={() => navigate('/app')}>Go to App</button>
      </nav>
      <div className="inventory-horizontal-content">
        <div className="inventory-header">
          <h1>Inventory Management</h1>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            style={{ display: 'none' }}
            id="excel-upload-input"
          />
          {excelError && <div style={{ color: 'red' }}>{excelError}</div>}
        </div>
        <div className="inventory-controls">
          <div className="control-group">
            <button className="control-button" onClick={handleRefillStocks}>Refill Stocks</button>
            <button className="control-button" onClick={handleUpdateSystem}>Update System</button>
            <button className="control-button" onClick={handleExportToExcel} disabled={!excelData}>Export to Excel</button>
          </div>
          <div className="control-group">
            {/* <button className="control-button" onClick={handleCallSupplier}>Call Supplier</button> */}
            <button className="control-button" onClick={handleUpdateSupplier}>Update Supplier</button>
          </div>
          <div className="control-group">
            <button className="control-button" onClick={handlePrintOrderDetails}>Print Order Details</button>
            <button className="control-button" onClick={handleRearrangeView}>Rearrange View</button>
          </div>
          <div className="stock-status">
            <h3>Stock Status: <span className={`status ${stockStatus.toLowerCase()}`}>{stockStatus}</span></h3>
            <p>{stockDescription}</p>
          </div>
        </div>
        <div className="inventory-horizontal-main">
          <div className="main-sections-row">
            <div className="products-ingredients-section inventory-scrollable">
              <div className="content-section">
                <h2>Products</h2>
                <div className="card-grid">
                  {sortedProducts.length > 0 ? (
                    sortedProducts.map((product) => (
                      <div key={product.id} className="ingredient-card">
                        <h3>{product.name}</h3>
                        <p>Code: {product.code}</p>
                        <p>Price: ${product.price}</p>
                        <p>Category: {product.category}</p>
                        <p>Stock: {product.stockNumber}</p>
                      </div>
                    ))
                  ) : (
                    <p>No products found</p>
                  )}
                </div>
              </div>
              <div className="content-section">
                <h2>Ingredients</h2>
                <div className="card-grid">
                  {sortedIngredients.length > 0 && sortedIngredients.map((ingredient) => (
                    <div key={`ing-${ingredient.id}`} className="ingredient-card">
                      <h3>{ingredient.name}</h3>
                      <p>Code: {ingredient.code}</p>
                      <p>Price: ${ingredient.price}</p>
                      <p>Category: {ingredient.category}</p>
                      <p>Stock: {ingredient.stockNumber}</p>
                    </div>
                  ))}
                  {sortedModifiers.length > 0 && sortedModifiers.map((mod) => (
                    <div key={`mod-${mod.id}`} className="ingredient-card">
                      <h3>{mod.name}</h3>
                      <p>Code: {mod.code}</p>
                      <p>Price: ${mod.price}</p>
                      <p>Category: {mod.category}</p>
                      <p>Stock: {mod.stockNumber}</p>
                    </div>
                  ))}
                  {sortedIngredients.length === 0 && sortedModifiers.length === 0 && (
                    <p>No ingredients or modifiers found</p>
                  )}
                  {showToast && (
                    <div className={`toast-notification${toastType === 'error' ? ' toast-error' : ''}`}>{toastMessage}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="stock-levels-section inventory-scrollable">
              <h2>Stock Levels</h2>
              <div className="stock-levels-card">
                <h3>Ingredients Status</h3>
                <div className="ingredients-list">
                  {sortedIngredients.map((ingredient) => (
                    <div key={ingredient.id} className="ingredient-status">
                      <span>{ingredient.name}</span>
                      <span className={`status-indicator ${getStockStatus(ingredient.stockNumber)}`}>
                        {getStockStatus(ingredient.stockNumber).charAt(0).toUpperCase() + getStockStatus(ingredient.stockNumber).slice(1)}
                      </span>
                    </div>
                  ))}
                  {sortedModifiers.map((mod) => (
                    <div key={mod.id} className="ingredient-status">
                      <span>{mod.name}</span>
                      <span className={`status-indicator ${getStockStatus(mod.stockNumber)}`}>
                        {getStockStatus(mod.stockNumber).charAt(0).toUpperCase() + getStockStatus(mod.stockNumber).slice(1)}
                      </span>
                    </div>
                  ))}
                  {sortedIngredients.length === 0 && sortedModifiers.length === 0 && (
                    <div className="ingredient-status">
                      <span>No ingredients found</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="stock-levels-buttons">
                <button className="stock-button" onClick={handleUpdateSystem}>Open Excel File</button>
                <button className="stock-button" onClick={() => window.location.reload()}>Refresh Inventory</button>
                <button className="stock-button" onClick={handleRearrangeView}>Sort</button>
              </div>
            </div>
          </div>
        </div>
        <RefillFormPopup
          open={showRefillPopup}
          onClose={() => setShowRefillPopup(false)}
          onSubmit={handleRefillSubmit}
          products={products}
          ingredients={ingredients}
          modifiers={modifiers}
        />
        <UpdateSupplierEmail
          open={showUpdateSupplierPopup}
          onClose={() => setShowUpdateSupplierPopup(false)}
        />
      </div>
    </div>
  );
}

export default Inventory;