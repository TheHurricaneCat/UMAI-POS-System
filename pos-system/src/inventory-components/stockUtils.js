export const getStockStatus = (stockNumber) => {
  if (typeof stockNumber !== 'number' || isNaN(stockNumber)) return 'low';
  if (stockNumber <= 10) return 'critical';
  if (stockNumber <= 30) return 'low';
  if (stockNumber <= 70) return 'medium';
  return 'high';
};

export const calOverallStockStatus = (products, ingredients, modifiers) => {
  const allItems = [...products, ...ingredients, ...modifiers];
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

  if (lowPercentage >= 50) {
    return { status: 'Critical', description: 'Urgent: Over half of your items are low on stock!' };
  } else if (lowPercentage >= 30) {
    return { status: 'Low', description: 'Warning: Several items need restocking soon.' };
  } else if (highPercentage >= 60) {
    return { status: 'High', description: 'Stock levels are healthy across most items.' };
  } else {
    return { status: 'Medium', description: 'Stock levels are adequate, but monitor for low items.' };
  }
}; 