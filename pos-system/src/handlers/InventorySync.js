import { supabase } from '../database/supabase';

/**
 * Deducts inventory for a list of items, updates Supabase, local state, Excel data, and cache.
 * @param {Array} itemsToDeduct - [{ code, quantity, type }]
 * @param {Object} context - { products, setProducts, ingredients, setIngredients, modifiers, setModifiers, excelData, setExcelData }
 * @returns {Promise<boolean>} - true if all succeeded, false otherwise
 */
export async function deductInventoryAndSync(itemsToDeduct, context) {
  const {
    products, setProducts,
    ingredients, setIngredients,
    modifiers, setModifiers,
    excelData, setExcelData,
    setToastMessage, setToastType
  } = context;

  let allSucceeded = true;
  let updatedProducts = [...products];
  let updatedIngredients = [...ingredients];
  let updatedModifiers = [...modifiers];
  let revertedItems = [];

  // Deduct in local state and Supabase
  for (const item of itemsToDeduct) {
    let arr, setArr;
    if (item.type === 'product') {
      arr = updatedProducts;
      setArr = setProducts;
    } else if (item.type === 'ingredient') {
      arr = updatedIngredients;
      setArr = setIngredients;
    } else if (item.type === 'modifier') {
      arr = updatedModifiers;
      setArr = setModifiers;
    } else {
      continue;
    }
    const idx = arr.findIndex(p => p.code === item.code);
    if (idx === -1) continue;
    const currentStock = arr[idx].stockNumber || 0;
    const newStock = Math.max(0, currentStock - item.quantity);
    let itemId = arr[idx].id;
    // If itemId is missing, try to fetch it from Supabase by code
    if (!itemId) {
      try {
        const { data: found, error: fetchError } = await supabase
          .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products')
          .select('id')
          .eq('code', arr[idx].code)
          .maybeSingle();
        if (fetchError) {
          console.error('[INVENTORY SYNC] Error fetching id by code:', arr[idx].code, fetchError);
        }
        if (found && found.id) {
          itemId = found.id;
          arr[idx].id = itemId; // update local state with id
        } else {
          console.warn('[INVENTORY SYNC] Could not find id for code, will update by code:', arr[idx].code);
        }
      } catch (fetchErr) {
        console.error('[INVENTORY SYNC] Exception fetching id by code:', arr[idx].code, fetchErr);
      }
    }
    // Always update by code (never by id)
    arr[idx] = { ...arr[idx], stockNumber: newStock };
    // Debug log before update
    console.log('[INVENTORY SYNC] Updating Supabase:', {
      code: arr[idx].code,
      newStock,
      payload: { quantity: newStock },
      table: import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products'
    });
    // Update Supabase by code only
    const { error } = await supabase
      .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products')
      .update({ quantity: newStock })
      .eq('code', arr[idx].code);
    if (error) {
      console.error('[INVENTORY SYNC] Failed to update Supabase for', arr[idx].code, error);
      if (setToastMessage && setToastType) {
        setToastMessage(`Failed to update stock for ${arr[idx].code} in database.`);
        setToastType('error');
      }
      // Revert local state for this item
      arr[idx] = { ...arr[idx], stockNumber: currentStock };
      revertedItems.push(arr[idx].code);
      allSucceeded = false;
    }
    setArr([...arr]);
  }

  // Update Excel data
  if (excelData && Array.isArray(excelData) && excelData.length > 1) {
    const headers = excelData[0].map(h => String(h).toLowerCase());
    const codeIdx = headers.findIndex(h => h.includes('code'));
    const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('quantity'));
    if (codeIdx !== -1 && stockIdx !== -1) {
      const newExcelData = excelData.map((row, i) => {
        if (i === 0) return row;
        const code = String(row[codeIdx]).trim();
        const deduction = itemsToDeduct.find(it => it.code === code);
        if (deduction) {
          // Find new stock from updated arrays
          let newStock = 0;
          let found = updatedProducts.find(p => p.code === code) || updatedIngredients.find(i => i.code === code) || updatedModifiers.find(m => m.code === code);
          if (found) newStock = found.stockNumber;
          const newRow = [...row];
          newRow[stockIdx] = newStock;
          return newRow;
        }
        return row;
      });
      setExcelData(newExcelData);
      // Also update cache
      try {
        localStorage.setItem('inventory_excel_data', JSON.stringify(newExcelData));
        localStorage.setItem('inventory_products', JSON.stringify(updatedProducts));
        localStorage.setItem('inventory_ingredients', JSON.stringify(updatedIngredients));
        localStorage.setItem('inventory_modifiers', JSON.stringify(updatedModifiers));
      } catch (e) {
        console.error('[INVENTORY SYNC] Failed to update cache:', e);
      }
    }
  }

  return allSucceeded;
} 