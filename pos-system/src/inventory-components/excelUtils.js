// Utility for parsing Excel rows for inventory
export const parseExcelRows = (jsonData) => {
  let products = [];
  let ingredients = [];
  let modifiers = [];

  console.log('[INVENTORY] Raw Excel data:', jsonData);

  if (!Array.isArray(jsonData) || jsonData.length < 2) {
    return { products, ingredients, modifiers };
  }

  const headers = jsonData[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, ''));
  console.log('[INVENTORY] Headers found:', headers);

  // More robust header detection
  const nameIdx = headers.findIndex(h => h.includes('name'));
  const priceIdx = headers.findIndex(h => h.includes('price'));
  const categoryIdx = headers.findIndex(h => h.includes('category'));
  const typeIdx = headers.findIndex(h => h.includes('type'));
  const contentIdx = headers.findIndex(h => h.includes('content'));
  const ingredientsIdx = headers.findIndex(h => h.includes('ingredient'));
  let stockIdx = headers.findIndex(h => h === 'quantity' || h === 'stock' || h.includes('quantity') || h.includes('stock'));
  if (stockIdx === -1) {
    stockIdx = headers.findIndex(h => h.replace(/[^a-z]/g, '').includes('quantity') || h.replace(/[^a-z]/g, '').includes('stock'));
  }
  const codeIdx = headers.findIndex(h => h.includes('code'));

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length < 2) continue;
    if (!row[nameIdx] || String(row[nameIdx]).trim() === '') continue;

    let rawStock = stockIdx !== -1 ? row[stockIdx] : undefined;
    let stockNumber = 0;
    if (rawStock !== undefined && rawStock !== null && rawStock !== '') {
      stockNumber = Number(String(rawStock).replace(/[^\d.-]/g, ''));
      if (isNaN(stockNumber)) stockNumber = 0;
    }

    const item = {
      id: `${row[nameIdx]}-${i}`,
      name: String(row[nameIdx]).trim(),
      price: priceIdx !== -1 ? Number(row[priceIdx]) || 0 : 0,
      stockNumber,
      category: categoryIdx !== -1 ? String(row[categoryIdx] || '').trim() : 'Uncategorized',
      code: codeIdx !== -1 ? String(row[codeIdx] || '').trim() : `CODE_${row[nameIdx]}`,
      content: contentIdx !== -1 ? String(row[contentIdx] || '').trim() : '',
      ingredients: ingredientsIdx !== -1 ? String(row[ingredientsIdx] || '').trim() : '',
    };

    // Skip if code is empty
    if (!item.code || item.code === '') continue;

    let type = 'product';
    if (typeIdx !== -1 && row[typeIdx]) {
      type = String(row[typeIdx]).toLowerCase().trim();
    } else {
      const code = item.code.toLowerCase();
      const name = item.name.toLowerCase();
      if (code.includes('ing') || name.includes('ingredient')) type = 'ingredient';
      else if (code.includes('mod') || name.includes('modifier')) type = 'modifier';
      else type = 'product';
    }

    if (type === 'product') products.push(item);
    else if (type === 'ingredient') ingredients.push(item);
    else if (type === 'modifier') modifiers.push(item);
  }

  return { products, ingredients, modifiers };
}; 