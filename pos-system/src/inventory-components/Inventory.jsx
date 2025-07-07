// --- Professional Table-Based Inventory Dashboard ---
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Inventory.css';
import * as XLSX from 'xlsx';
import { supabase } from '../database/supabase';
import { testSupabaseConnection } from '../database/supabase';
import { useExcelData } from '../context/ExcelDataContext';
import RefillFormPopup from './RefillFormPopup';
import UpdateSupplierEmail from './UpdateSupplierEmail';
import { parseExcelRows } from './excelUtils';
import { syncExcelDataWithSupabase, updateStockInSupabase, fetchInventoryFromSupabase } from './inventorySupabase';
import { saveInventoryToCache, clearInventoryCache } from './inventoryCache';
import { getStockStatus, calOverallStockStatus } from './stockUtils';
import { getLatestInventoryFile, downloadInventoryFile, exportInventoryToStorage } from './storageUtils';
import Papa from 'papaparse';

function Inventory() {
  const navigate = useNavigate();
  const [stockStatus, setStockStatus] = useState('Normal');
  const [stockDescription, setStockDescription] = useState('All ingredients are at adequate levels');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [sortMode, setSortMode] = useState('name');
  const [excelError, setExcelError] = useState('');
  const [showRefillPopup, setShowRefillPopup] = useState(false);
  const [showUpdateSupplierPopup, setShowUpdateSupplierPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'products', 'ingredients', 'modifiers'
  const [dataSource, setDataSource] = useState('database'); // 'database' or 'cache'
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [justSynced, setJustSynced] = useState(false);
  const channelRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Use context for inventory state and actions
  const {
    excelData, setExcelData,
    products, setProducts,
    ingredients, setIngredients,
    modifiers, setModifiers,
    exportToExcel,
    refreshInventory
  } = useExcelData();

  // --- Fetch data from Supabase on component mount ---
  useEffect(() => {
    // Test Supabase connection first
    testSupabaseConnection().then((isConnected) => {
      if (!isConnected) {
        console.error('[INVENTORY] Supabase connection failed, using cached data only');
        setToastMessage('Database connection failed. Using cached data.');
        setToastType('warning');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    });

    // Check if we have cached Excel data first
    const cachedExcelData = localStorage.getItem('inventory_excel_data');
    const cachedProducts = localStorage.getItem('inventory_products');
    const cachedIngredients = localStorage.getItem('inventory_ingredients');
    const cachedModifiers = localStorage.getItem('inventory_modifiers');
    
    if (cachedExcelData && cachedProducts && cachedIngredients && cachedModifiers) {
      try {
        console.log('[INVENTORY] Loading cached inventory data...');
        setExcelData(JSON.parse(cachedExcelData));
        setProducts(JSON.parse(cachedProducts));
        setIngredients(JSON.parse(cachedIngredients));
        setModifiers(JSON.parse(cachedModifiers));
        setDataSource('cache');
        setLoading(false);
        console.log('[INVENTORY] Cached data loaded successfully');
      } catch (error) {
        console.error('[INVENTORY] Error loading cached data:', error);
        // Fall back to fetching from Supabase
        fetchInventoryFromSupabase();
      }
    } else {
      // Only fetch from Supabase if no cached data exists
      fetchInventoryFromSupabase();
    }

    // Set up real-time subscription for inventory changes
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products'
        },
        (payload) => {
          console.log('[INVENTORY] Real-time change detected:', payload);
          
          // Refresh inventory data when changes occur
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            if (justSynced) {
              console.log('[INVENTORY] Skipping fetch from Supabase due to recent local sync.');
              setJustSynced(false);
              return;
            }
            console.log('[INVENTORY] Refreshing inventory due to real-time change...');
            fetchInventoryFromSupabase();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Fallback polling mechanism
    const startPolling = () => {
      console.log('[INVENTORY] Starting fallback polling mechanism...');
      const interval = setInterval(() => {
        if (justSynced) {
          console.log('[INVENTORY] Skipping polling fetch from Supabase due to recent local sync.');
          setJustSynced(false);
          return;
        }
        console.log('[INVENTORY] Polling for inventory updates...');
        fetchInventoryFromSupabase();
      }, 30000); // Poll every 30 seconds
      setPollingInterval(interval);
      setRealtimeEnabled(false);
    };

    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };

    // Initialize subscription
    startPolling();

    // Cleanup subscription on unmount
    return () => {
      console.log('[INVENTORY] Cleaning up real-time subscription...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      stopPolling(); // Ensure polling is stopped on unmount
    };
  }, [setExcelData, setProducts, setIngredients, setModifiers]);

  // --- Automatic import from Supabase Storage on app start ---
  useEffect(() => {
    async function importFromStorageIfNeeded() {
      // Only import if no cached inventory exists
      const cachedProducts = localStorage.getItem('inventory_products');
      if (cachedProducts) return;
      try {
        setLoading(true);
        const filename = await getLatestInventoryFile();
        if (!filename) {
          setLoading(false);
          return;
        }
        const fileBuffer = await downloadInventoryFile(filename);
        let jsonData;
        if (filename.endsWith('.xlsx')) {
          const workbook = XLSX.read(fileBuffer, { type: 'array' });
          const sheetNames = workbook.SheetNames;
          if (sheetNames.length === 0) throw new Error('No sheets in Excel file');
          const worksheet = workbook.Sheets[sheetNames[0]];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        } else if (filename.endsWith('.csv')) {
          const text = new TextDecoder().decode(fileBuffer);
          const parsed = Papa.parse(text, { skipEmptyLines: true });
          jsonData = parsed.data;
        } else {
          throw new Error('Unsupported file type');
        }
        const { products, ingredients, modifiers } = parseExcelRows(jsonData);
        await syncExcelDataWithSupabase(products, ingredients, modifiers);
        // Fetch from DB to ensure state matches DB
        const { products: dbProducts, ingredients: dbIngredients, modifiers: dbModifiers } = await fetchInventoryFromSupabase();
        setProducts(dbProducts);
        setIngredients(dbIngredients);
        setModifiers(dbModifiers);
        saveInventoryToCache(jsonData, dbProducts, dbIngredients, dbModifiers);
        await exportInventoryToStorage(dbProducts, dbIngredients, dbModifiers);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        console.error('[INVENTORY] Error importing from storage:', err);
      }
    }
    importFromStorageIfNeeded();
  }, []);

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setToastMessage('No file selected. Please choose an Excel file.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    
    console.log('[INVENTORY] File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    
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
    
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        console.log('[INVENTORY] File read successfully, processing...');
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        
        console.log('[INVENTORY] Excel sheets found:', sheetNames);
        
        if (sheetNames.length === 0) {
          setToastMessage('No sheets found in Excel file.');
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
          setLoading(false);
          return;
        }
        
        const worksheet = workbook.Sheets[sheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('[INVENTORY] Excel data converted to JSON, rows:', jsonData.length);
        
        setExcelData(jsonData);
        const { products: parsedProducts, ingredients: parsedIngredients, modifiers: parsedModifiers } = parseExcelRows(jsonData);
        
        if (parsedProducts.length === 0 && parsedIngredients.length === 0 && parsedModifiers.length === 0) {
          setToastMessage('No valid data found in Excel file. Please check the format.');
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          setLoading(false);
          return;
        }
        
        // Sync with Supabase
        console.log('[INVENTORY] Starting Excel sync with Supabase...');
        const syncSuccess = await syncExcelDataWithSupabase(parsedProducts, parsedIngredients, parsedModifiers);
        
        if (syncSuccess) {
          // Fetch latest data from Supabase to ensure local state matches the database
          setToastMessage('Sync successful! Fetching latest data from database...');
          setToastType('info');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);

          setLoading(true);
          const { products: dbProducts, ingredients: dbIngredients, modifiers: dbModifiers } = await fetchInventoryFromSupabase();
          setProducts(dbProducts);
          setIngredients(dbIngredients);
          setModifiers(dbModifiers);
          saveInventoryToCache(jsonData, dbProducts, dbIngredients, dbModifiers);
          await exportInventoryToStorage(dbProducts, dbIngredients, dbModifiers);
          setLoading(false);

          setToastMessage(`Excel file uploaded and database updated! Synced ${dbProducts.length + dbIngredients.length + dbModifiers.length} items.`);
          setToastType('success');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);
        } else {
          setToastMessage('Excel file loaded but failed to sync with database. Please try again.');
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }
      } catch (err) {
        console.error('[INVENTORY] Error processing Excel file:', err);
        setToastMessage(`Failed to parse Excel file: ${err.message}`);
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    
    reader.onerror = (error) => {
      console.error('[INVENTORY] FileReader error:', error);
      setToastMessage('Error reading the file. Please try again.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setLoading(false);
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

  const handleRefillSubmit = async (refillList) => {
    let updatedProducts = [...products];
    let updatedIngredients = [...ingredients];
    let updatedModifiers = [...modifiers];
    
    const updatePromises = [];
    
    refillList.forEach(item => {
      if (item.type === 'product') {
        updatedProducts = updatedProducts.map(p => {
          if (p.code === item.code) {
            const newStock = p.stockNumber + item.refillAmount;
            updatePromises.push(updateStockInSupabase(p.id, newStock, 'product'));
            return { ...p, stockNumber: newStock };
          }
          return p;
        });
      } else if (item.type === 'ingredient') {
        updatedIngredients = updatedIngredients.map(i => {
          if (i.code === item.code) {
            const newStock = i.stockNumber + item.refillAmount;
            updatePromises.push(updateStockInSupabase(i.id, newStock, 'ingredient'));
            return { ...i, stockNumber: newStock };
          }
          return i;
        });
      } else if (item.type === 'modifier') {
        updatedModifiers = updatedModifiers.map(m => {
          if (m.code === item.code) {
            const newStock = m.stockNumber + item.refillAmount;
            updatePromises.push(updateStockInSupabase(m.id, newStock, 'modifier'));
            return { ...m, stockNumber: newStock };
          }
          return m;
        });
      }
    });
    
    try {
      await Promise.all(updatePromises);
      setProducts(updatedProducts);
      setIngredients(updatedIngredients);
      setModifiers(updatedModifiers);
      
      // Save updated data to cache
      saveInventoryToCache(excelData, updatedProducts, updatedIngredients, updatedModifiers);
      
      setToastMessage('Selected items refilled successfully!');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('[INVENTORY] Error updating stock:', error);
      setToastMessage('Some items failed to update. Please try again.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleUpdateSystem = () => {
    setToastMessage('Please select an Excel file to update the system.');
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    document.getElementById('excel-upload-input')?.click();
  };

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

  const handleRefreshInventory = async () => {
    // Clear cache and fetch fresh data from database
    clearInventoryCache();
    await fetchInventoryFromSupabase();
  };

  const handleClearCache = async () => {
    clearInventoryCache();
    setToastMessage('Cache cleared. Fetching latest inventory from database...');
    setToastType('info');
    setShowToast(true);
    setLoading(true);
    await refreshInventory();
    setLoading(false);
  };

  const handleRearrangeView = () => {
    const newSortMode = sortMode === 'stock-desc' ? 'stock-asc' : 'stock-desc';
    setSortMode(newSortMode);
    
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
    
    if (newSortMode === 'stock-desc') {
      setProducts(bubbleSort(products, false));
      setIngredients(bubbleSort(ingredients, false));
      setModifiers(bubbleSort(modifiers, false));
    } else {
      setProducts(bubbleSort(products, true));
      setIngredients(bubbleSort(ingredients, true));
      setModifiers(bubbleSort(modifiers, true));
    }
  };

  const handleExportToExcel = () => {
    if ((products.length === 0 && ingredients.length === 0 && modifiers.length === 0) || !excelData || !Array.isArray(excelData) || excelData.length === 0) {
      setToastMessage('No inventory data to export. Please upload an Excel file and ensure inventory is loaded.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
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

  // --- Get filtered and sorted data ---
  const getAllItems = () => {
    const allItems = [
      ...products.map(item => ({ ...item, itemType: 'product' })),
      ...ingredients.map(item => ({ ...item, itemType: 'ingredient' })),
      ...modifiers.map(item => ({ ...item, itemType: 'modifier' }))
    ];
    
    switch (activeTab) {
      case 'products':
        return allItems.filter(item => item.itemType === 'product');
      case 'ingredients':
        return allItems.filter(item => item.itemType === 'ingredient');
      case 'modifiers':
        return allItems.filter(item => item.itemType === 'modifier');
      default:
        return allItems;
    }
  };

  // Enhanced search ranking: exact matches first, then partial matches
  const getSearchRank = (item, term) => {
    const lowerTerm = term.toLowerCase();
    if (!lowerTerm) return 2; // No search, neutral rank
    // Check for exact match in name, code, or category
    if (
      item.name?.toLowerCase() === lowerTerm ||
      item.code?.toLowerCase() === lowerTerm ||
      item.category?.toLowerCase() === lowerTerm
    ) {
      return 0; // Highest priority
    }
    // Check for partial match
    if (
      item.name?.toLowerCase().includes(lowerTerm) ||
      item.code?.toLowerCase().includes(lowerTerm) ||
      item.category?.toLowerCase().includes(lowerTerm)
    ) {
      return 1; // Medium priority
    }
    return 2; // No match
  };

  const filteredItems = getAllItems().filter(item => {
    if (!searchTerm.trim()) return true;
    const lowerTerm = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(lowerTerm) ||
      item.code?.toLowerCase().includes(lowerTerm) ||
      item.category?.toLowerCase().includes(lowerTerm)
    );
  });

  const sortedItems = filteredItems.sort((a, b) => {
    const rankA = getSearchRank(a, searchTerm);
    const rankB = getSearchRank(b, searchTerm);
    if (rankA !== rankB) return rankA - rankB;
    // Fallback: alphabetical by name
    return a.name.localeCompare(b.name);
  });
  
  if (loading) {
    return (
      <div className="inventory-dashboard">
        <header className="dashboard-header">
          <h1>Inventory Management</h1>
          <button className="nav-btn" onClick={() => navigate('/app')}>Go to App</button>
        </header>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Inventory Management</h1>
          <div className="data-source-indicator">
            <span className={`source-badge ${dataSource}`}>
              {dataSource === 'cache' ? '📁 Cached Data' : '🗄️ Database'}
            </span>
          </div>
        </div>
        <button className="nav-btn" onClick={() => navigate('/app')}>Go to App</button>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Stock Status Card */}
        <section className="status-card">
          <div className="status-content">
            <div className="status-icon">
              <span className={`status-badge ${stockStatus.toLowerCase()}`}>
                {stockStatus === 'High' ? '✓' : stockStatus === 'Critical' ? '⚠' : '•'}
              </span>
            </div>
            <div className="status-text">
              <h3>Stock Status: <span className={`status ${stockStatus.toLowerCase()}`}>{stockStatus}</span></h3>
              <p>{stockDescription}</p>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <section className="toolbar">
          <div className="toolbar-left">
            <button className="toolbar-btn primary" onClick={handleRefillStocks}>
              <span className="btn-icon">📦</span>
              Refill Stocks
            </button>
            <button className="toolbar-btn" onClick={handleUpdateSystem} disabled={loading}>
              <span className="btn-icon">{loading ? '⏳' : '📁'}</span>
              {loading ? 'Syncing...' : 'Update System'}
            </button>
            <button className="toolbar-btn" onClick={handleExportToExcel} disabled={!excelData}>
              <span className="btn-icon">📊</span>
              Export to Excel
            </button>
          </div>
          <div className="toolbar-right">
            <button className="toolbar-btn" onClick={handleUpdateSupplier}>
              <span className="btn-icon">📧</span>
              Update Supplier
            </button>
            <button className="toolbar-btn" onClick={handlePrintOrderDetails}>
              <span className="btn-icon">🖨️</span>
              Print
            </button>
            <button className="toolbar-btn" onClick={handleRearrangeView}>
              <span className="btn-icon">↕️</span>
              Sort
            </button>
            <button className="toolbar-btn" onClick={handleClearCache}>
              <span className="btn-icon">🗑️</span>
              Clear Cache
            </button>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="tab-navigation" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <button 
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Items ({products.length + ingredients.length + modifiers.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              Products ({products.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
              onClick={() => setActiveTab('ingredients')}
            >
              Ingredients ({ingredients.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'modifiers' ? 'active' : ''}`}
              onClick={() => setActiveTab('modifiers')}
            >
              Modifiers ({modifiers.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'discounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('discounts')}
            >
              Discounts (2)
            </button>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888' }}>
              {/* Magnifying glass SVG */}
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" stroke="#888" strokeWidth="2"/><line x1="14.4142" y1="14" x2="18" y2="17.5858" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
            <input
              type="text"
              className="search-bar"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ minWidth: 180, padding: '6px 32px 6px 32px', borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#888', padding: 0 }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </section>

        {/* Search clarification message */}
        {searchTerm.trim() !== '' && (
          <div style={{
            margin: '16px 0 0 0',
            padding: '8px 16px',
            background: '#f3f6fa',
            borderRadius: '6px',
            color: '#333',
            fontWeight: 500,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{marginRight: 6}} xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" stroke="#888" strokeWidth="2"/><line x1="14.4142" y1="14" x2="18" y2="17.5858" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg>
            Searching for: <span style={{fontWeight: 700, color: '#1976d2'}}>&quot;{searchTerm}&quot;</span>
          </div>
        )}

        {/* Inventory Table */}
        {activeTab === 'discounts' ? (
          <section className="table-container">
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>PWD</td>
                    <td>Person with Disability Discount</td>
                    <td>Percentage</td>
                    <td>20%</td>
                  </tr>
                  <tr>
                    <td>Student Discount</td>
                    <td>Valid Student ID Required</td>
                    <td>Percentage</td>
                    <td>15%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="table-container">
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.length > 0 ? (
                    sortedItems.map((item) => (
                      <tr key={item.id} className="table-row">
                        <td className="item-name">{item.name}</td>
                        <td className="item-code">{item.code || '-'}</td>
                        <td className="item-type">
                          <span className={`type-badge ${item.itemType}`}>
                            {item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}
                          </span>
                        </td>
                        <td className="item-category">{item.category || 'Uncategorized'}</td>
                        <td className="item-price">${item.price.toFixed(2)}</td>
                        <td className="item-stock">{item.stockNumber}</td>
                        <td className="item-status">
                          <span className={`stock-status-badge ${getStockStatus(item.stockNumber)}`}>
                            {getStockStatus(item.stockNumber).charAt(0).toUpperCase() + getStockStatus(item.stockNumber).slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : searchTerm.trim() !== '' ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        <div className="no-data-content">
                          <span className="no-data-icon">🔍</span>
                          <p>No results found for "{searchTerm}"</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="7" className="no-data">
                        <div className="no-data-content">
                          <span className="no-data-icon">📋</span>
                          <p>No inventory data found</p>
                          <button className="upload-btn" onClick={handleUpdateSystem}>
                            Upload Excel File
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Hidden file input */}
      <input
        id="excel-upload-input"
        type="file"
        accept=".xlsx,.xls"
        onChange={handleExcelUpload}
        style={{ display: 'none' }}
      />

      {/* Toast Notifications */}
      {showToast && (
        <div className={`toast-notification${toastType === 'error' ? ' toast-error' : ''}`}>
          {toastMessage}
        </div>
      )}

      {/* Popups */}
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
  );
}

export default Inventory;