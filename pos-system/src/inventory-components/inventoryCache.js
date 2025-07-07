export const saveInventoryToCache = (excelData, products, ingredients, modifiers) => {
  try {
    localStorage.setItem('inventory_excel_data', JSON.stringify(excelData));
    localStorage.setItem('inventory_products', JSON.stringify(products));
    localStorage.setItem('inventory_ingredients', JSON.stringify(ingredients));
    localStorage.setItem('inventory_modifiers', JSON.stringify(modifiers));
    console.log('[INVENTORY] Inventory data cached successfully');
  } catch (error) {
    console.error('[INVENTORY] Error caching inventory data:', error);
  }
};

export const clearInventoryCache = () => {
  try {
    localStorage.removeItem('inventory_excel_data');
    localStorage.removeItem('inventory_products');
    localStorage.removeItem('inventory_ingredients');
    localStorage.removeItem('inventory_modifiers');
    console.log('[INVENTORY] Inventory cache cleared');
  } catch (error) {
    console.error('[INVENTORY] Error clearing cache:', error);
  }
}; 