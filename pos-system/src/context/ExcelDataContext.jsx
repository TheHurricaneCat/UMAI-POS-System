import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { supabase } from '../database/supabase';

const ExcelDataContext = createContext();

export function ExcelDataProvider({ children }) {
  const [excelData, setExcelData] = useState(null); // raw 2D array
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Track if deduction just happened
  const pendingExport = useRef(false);

  // Fetch inventory data from Supabase
  const fetchInventoryFromSupabase = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[INVENTORY CONTEXT] Fetching inventory data from Supabase...');
      
      const { data, error } = await supabase
        .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[INVENTORY CONTEXT] Error fetching from Supabase:', error);
        setError('Failed to load inventory from database');
        return false;
      }

      if (data && data.length > 0) {
        // Separate data by type
        const productsData = data.filter(item => item.type === 'product' || !item.type);
        const ingredientsData = data.filter(item => item.type === 'ingredient');
        const modifiersData = data.filter(item => item.type === 'modifier');

        // Transform data to match expected format
        const transformData = (items) => items.map(item => ({
          id: item.id || `${item.name}-${item.code}`,
          name: item.name,
          price: Number(item.price) || 0,
          stockNumber: Number(item.quantity) || 0,
          category: item.category || 'Uncategorized',
          code: item.code || '',
          type: item.type || 'product'
        }));

        setProducts(transformData(productsData));
        setIngredients(transformData(ingredientsData));
        setModifiers(transformData(modifiersData));

        console.log('[INVENTORY CONTEXT] Successfully loaded:', {
          products: productsData.length,
          ingredients: ingredientsData.length,
          modifiers: modifiersData.length
        });
        return true;
      } else {
        console.log('[INVENTORY CONTEXT] No data found in database');
        setError('No inventory data found in database');
        return false;
      }
    } catch (error) {
      console.error('[INVENTORY CONTEXT] Exception during fetch:', error);
      setError('Error connecting to database');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update stock in Supabase
  const updateStockInSupabase = async (itemId, newStockNumber) => {
    try {
      const { error } = await supabase
        .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products')
        .update({ quantity: newStockNumber })
        .eq('id', itemId);

      if (error) {
        console.error('[INVENTORY CONTEXT] Error updating stock in Supabase:', error);
        return false;
      }

      console.log('[INVENTORY CONTEXT] Stock updated successfully in database');
      return true;
    } catch (error) {
      console.error('[INVENTORY CONTEXT] Exception during stock update:', error);
      return false;
    }
  };

  // Enhanced deduct stock function with Supabase integration
  const deductStock = async (code, quantity, itemType = null) => {
    try {
      console.log(`[INVENTORY CONTEXT] Deducting ${quantity} from item with code: ${code}`);
      console.log(`[INVENTORY CONTEXT] Current products:`, products.map(p => ({ name: p.name, code: p.code, stock: p.stockNumber })));
      console.log(`[INVENTORY CONTEXT] Current ingredients:`, ingredients.map(i => ({ name: i.name, code: i.code, stock: i.stockNumber })));
      console.log(`[INVENTORY CONTEXT] Current modifiers:`, modifiers.map(m => ({ name: m.name, code: m.code, stock: m.stockNumber })));
      
      let updated = false;
      let itemToUpdate = null;
      let currentStock = 0;

      // Find the item in the appropriate array
      const findItem = (arr) => arr.find(item => item.code === code);
      
      let item = findItem(products) || findItem(ingredients) || findItem(modifiers);
      
      if (!item) {
        console.warn(`[INVENTORY CONTEXT] Item with code ${code} not found in any inventory arrays`);
        return false;
      }
      
      console.log(`[INVENTORY CONTEXT] Found item:`, item);

      currentStock = item.stockNumber || 0;
      const newStock = Math.max(0, currentStock - quantity);
      
      if (newStock === currentStock) {
        console.warn(`[INVENTORY CONTEXT] Stock deduction would result in negative stock for ${code}`);
        return false;
      }

      // Update local state
      const updateStock = (arr) => arr.map(item => {
        if (item.code === code) {
          updated = true;
          itemToUpdate = { ...item, stockNumber: newStock };
          return itemToUpdate;
        }
        return item;
      });

      setProducts(prev => updateStock(prev));
      setIngredients(prev => updateStock(prev));
      setModifiers(prev => updateStock(prev));

      // Update Supabase
      if (itemToUpdate && itemToUpdate.id) {
        const success = await updateStockInSupabase(itemToUpdate.id, newStock);
        if (!success) {
          console.error(`[INVENTORY CONTEXT] Failed to update stock in Supabase for ${code}`);
          // Revert local state if Supabase update failed
          const revertStock = (arr) => arr.map(item => 
            item.code === code ? { ...item, stockNumber: currentStock } : item
          );
          setProducts(prev => revertStock(prev));
          setIngredients(prev => revertStock(prev));
          setModifiers(prev => revertStock(prev));
          return false;
        }
      }

      pendingExport.current = true;
      console.log(`[INVENTORY CONTEXT] Successfully deducted ${quantity} from ${code}. New stock: ${newStock}`);
      return true;
    } catch (error) {
      console.error(`[INVENTORY CONTEXT] Error deducting stock for ${code}:`, error);
      return false;
    }
  };

  // Batch deduct stock for multiple items
  const deductStockBatch = async (items) => {
    const results = [];
    for (const item of items) {
      const success = await deductStock(item.code, item.quantity, item.type);
      results.push({ code: item.code, success });
    }
    return results;
  };

  // Check if item has sufficient stock
  const checkStockAvailability = (code, quantity) => {
    const findItem = (arr) => arr.find(item => item.code === code);
    const item = findItem(products) || findItem(ingredients) || findItem(modifiers);
    
    if (!item) {
      return { available: false, currentStock: 0, message: 'Item not found' };
    }
    
    const currentStock = item.stockNumber || 0;
    const available = currentStock >= quantity;
    
    return {
      available,
      currentStock,
      message: available ? 'Sufficient stock' : `Insufficient stock. Available: ${currentStock}`
    };
  };

  // Validate entire order for stock availability
  const validateOrderStock = (orderItems) => {
    const validationResults = [];
    let allAvailable = true;

    orderItems.forEach(item => {
      const stockCheck = checkStockAvailability(item.code, item.quantity);
      validationResults.push({
        code: item.code,
        name: item.name,
        requested: item.quantity,
        ...stockCheck
      });
      
      if (!stockCheck.available) {
        allAvailable = false;
      }
    });

    return {
      allAvailable,
      results: validationResults
    };
  };

  // Export current data to Excel
  const exportToExcel = () => {
    if (!excelData) return;
    const headers = excelData[0];
    const codeIdx = headers.findIndex(h => String(h).toLowerCase() === 'code');
    const stockIdx = headers.findIndex(h => String(h).toLowerCase().startsWith('stock'));
    const typeIdx = headers.findIndex(h => String(h).toLowerCase() === 'type');
    const nameIdx = headers.findIndex(h => String(h).toLowerCase() === 'name');
    const newRows = excelData.map((row, i) => {
      if (i === 0) return row;
      let found = null;
      if (typeIdx !== -1 && row[typeIdx]) {
        const type = String(row[typeIdx]).toLowerCase();
        if (type === 'product') found = products.find(p => p.name === row[nameIdx]);
        else if (type === 'ingredient') found = ingredients.find(p => p.name === row[nameIdx]);
        else if (type === 'modifier') found = modifiers.find(p => p.name === row[nameIdx]);
      }
      if (found && stockIdx !== -1) {
        const newRow = [...row];
        newRow[stockIdx] = found.stockNumber;
        return newRow;
      }
      return row;
    });
    // Use dynamic import for XLSX
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet(newRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, 'UpdatedInventory.xlsx');
    }).catch(error => {
      console.error('Error importing XLSX:', error);
    });
  };

  // Auto-export when stock is deducted
  useEffect(() => {
    if (pendingExport.current) {
      pendingExport.current = false;
      // Auto-export after a short delay to ensure state is updated
      setTimeout(() => {
        exportToExcel();
      }, 100);
    }
  }, [products, ingredients, modifiers]);

  // After Excel import or cache load, always fetch from Supabase for real IDs
  useEffect(() => {
    // Check if we have cached inventory data first
    const cachedProducts = localStorage.getItem('inventory_products');
    const cachedIngredients = localStorage.getItem('inventory_ingredients');
    const cachedModifiers = localStorage.getItem('inventory_modifiers');
    
    if (cachedProducts && cachedIngredients && cachedModifiers) {
      try {
        console.log('[INVENTORY CONTEXT] Loading cached inventory data...');
        setProducts(JSON.parse(cachedProducts));
        setIngredients(JSON.parse(cachedIngredients));
        setModifiers(JSON.parse(cachedModifiers));
        setLoading(false);
        console.log('[INVENTORY CONTEXT] Cached data loaded successfully');
        // Always fetch from Supabase after cache load to get real IDs
        fetchInventoryFromSupabase().then(() => {
          // Warn if any item has a synthetic ID
          const hasFakeId = (arr) => arr.some(item => typeof item.id === 'string' && item.id.includes('-'));
          if (hasFakeId(products) || hasFakeId(ingredients) || hasFakeId(modifiers)) {
            console.warn('[INVENTORY CONTEXT] Warning: Some items have synthetic IDs. Fetched from Supabase to correct.');
          }
        });
        return;
      } catch (error) {
        console.error('[INVENTORY CONTEXT] Error loading cached data:', error);
        // Fall back to fetching from Supabase
      }
    }
    // Only fetch from Supabase if no cached data exists
    fetchInventoryFromSupabase();
  }, []);

  return (
    <ExcelDataContext.Provider value={{
      excelData, setExcelData,
      products, setProducts,
      ingredients, setIngredients,
      modifiers, setModifiers,
      loading,
      error,
      deductStock,
      deductStockBatch,
      checkStockAvailability,
      validateOrderStock,
      exportToExcel,
      fetchInventoryFromSupabase,
      refreshInventory: fetchInventoryFromSupabase
    }}>
      {children}
    </ExcelDataContext.Provider>
  );
}

export function useExcelData() {
  return useContext(ExcelDataContext);
}
