import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

const ExcelDataContext = createContext();

export function ExcelDataProvider({ children }) {
  const [excelData, setExcelData] = useState(null); // raw 2D array
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  // Track if deduction just happened
  const pendingExport = useRef(false);

  // Deduct stock for a given code and quantity, with callback
  const deductStock = (code, quantity, cb) => {
    let updated = false;
    const updateStock = (arr) => arr.map(item => {
      if (item.code === code) {
        updated = true;
        return { ...item, stockNumber: Math.max(0, (item.stockNumber || 0) - quantity) };
      }
      return item;
    });
    setProducts(prev => updateStock(prev));
    setIngredients(prev => updateStock(prev));
    setModifiers(prev => updateStock(prev));
    pendingExport.current = true;
    if (cb) setTimeout(cb, 0); // allow state to update first
    return updated;
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
    // Use import for xlsx at the top for React/browser compatibility
    const ws = XLSX.utils.aoa_to_sheet(newRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'UpdatedInventory.xlsx');
  };

  // Auto-export after any inventory state change if deduction just happened
  useEffect(() => {
    if (pendingExport.current) {
      exportToExcel();
      pendingExport.current = false;
    }
  }, [products, ingredients, modifiers]);

  return (
    <ExcelDataContext.Provider value={{
      excelData, setExcelData,
      products, setProducts,
      ingredients, setIngredients,
      modifiers, setModifiers,
      deductStock,
      exportToExcel
    }}>
      {children}
    </ExcelDataContext.Provider>
  );
}

export function useExcelData() {
  return useContext(ExcelDataContext);
}
