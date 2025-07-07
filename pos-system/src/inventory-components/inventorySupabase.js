import { supabase } from '../database/supabase';

export const updateStockInSupabase = async (itemId, newStockNumber, itemType) => {
  try {
    const { error } = await supabase
      .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products')
      .update({ quantity: newStockNumber })
      .eq('id', itemId);
    if (error) {
      console.error('[INVENTORY] Error updating stock in Supabase:', error);
      return false;
    }
    console.log('[INVENTORY] Stock updated successfully in database');
    return true;
  } catch (error) {
    console.error('[INVENTORY] Exception during stock update:', error);
    return false;
  }
};

export const syncExcelDataWithSupabase = async (parsedProducts, parsedIngredients, parsedModifiers) => {
  try {
    console.log('[INVENTORY] Syncing Excel data with Supabase...');
    const allItems = [
      ...parsedProducts.map(item => ({ ...item, type: 'product' })),
      ...parsedIngredients.map(item => ({ ...item, type: 'ingredient' })),
      ...parsedModifiers.map(item => ({ ...item, type: 'modifier' }))
    ];
    let successCount = 0;
    let errorCount = 0;
    for (const item of allItems) {
      if (!item.name || !item.code) continue;
      if (!item.code || item.code.trim() === '') {
        console.warn('[INVENTORY] Skipping item with empty code:', item);
        continue;
      }
      try {
        // Always try to update first
        const { data: updated, error: updateError } = await supabase
          .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products')
          .update({
            name: item.name,
            price: item.price || 0,
            quantity: item.stockNumber || 0,
            category: item.category || 'Uncategorized',
            type: item.type || 'product',
            content: item.content || '',
            ingredients: item.ingredients || ''
          })
          .eq('code', item.code)
          .select();
        if (updateError) {
          console.error('[INVENTORY] Error updating item:', item.code, updateError);
          errorCount++;
          continue;
        }
        if (updated && updated.length > 0) {
          console.log('[INVENTORY] Updated item:', item.code);
          successCount++;
        } else {
          // If not updated (doesn't exist), insert new
          const { error: insertError } = await supabase
            .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products')
            .insert({
              name: item.name,
              code: item.code,
              price: item.price || 0,
              quantity: item.stockNumber || 0,
              category: item.category || 'Uncategorized',
              type: item.type || 'product',
              content: item.content || '',
              ingredients: item.ingredients || ''
            });
          if (insertError) {
            console.error('[INVENTORY] Error inserting item:', item.code, insertError);
            errorCount++;
          } else {
            console.log('[INVENTORY] Inserted new item:', item.code);
            successCount++;
          }
        }
      } catch (itemError) {
        console.error('[INVENTORY] Exception processing item:', item.code, itemError);
        errorCount++;
      }
    }
    console.log(`[INVENTORY] Sync completed: ${successCount} successful, ${errorCount} errors`);
    return errorCount === 0;
  } catch (error) {
    console.error('[INVENTORY] Exception during Excel sync:', error);
    return false;
  }
};

export const fetchInventoryFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE || 'products')
      .select('*')
      .order('name', { ascending: true });
    if (error) return { products: [], ingredients: [], modifiers: [] };
    const productsData = data.filter(item => item.type === 'product' || !item.type);
    const ingredientsData = data.filter(item => item.type === 'ingredient');
    const modifiersData = data.filter(item => item.type === 'modifier');
    const transformData = (items) => items.map(item => ({
      id: item.id || `${item.name}-${item.code}`,
      name: item.name,
      price: Number(item.price) || 0,
      stockNumber: Number(item.quantity) || 0,
      category: item.category || 'Uncategorized',
      code: item.code || '',
      type: item.type || 'product'
    }));
    return {
      products: transformData(productsData),
      ingredients: transformData(ingredientsData),
      modifiers: transformData(modifiersData)
    };
  } catch (error) {
    return { products: [], ingredients: [], modifiers: [] };
  }
}; 