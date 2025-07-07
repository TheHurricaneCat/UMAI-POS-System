import { supabase } from '../database/supabase';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const INVENTORY_BUCKET = 'inventory.storage'; // Change if your bucket name is different

// List all files in the inventory storage bucket
export async function listInventoryFiles() {
  const { data, error } = await supabase.storage.from(INVENTORY_BUCKET).list('', { limit: 100, offset: 0 });
  if (error) throw error;
  return data;
}

// Get the latest inventory file (xlsx or csv)
export async function getLatestInventoryFile() {
  const files = await listInventoryFiles();
  if (!files || files.length === 0) return null;
  // Prefer .xlsx, then .csv
  const xlsx = files.filter(f => f.name.endsWith('.xlsx'));
  const csv = files.filter(f => f.name.endsWith('.csv'));
  const candidates = [...xlsx, ...csv];
  if (candidates.length === 0) return null;
  // Sort by last_modified if available, else by name
  candidates.sort((a, b) => (b.last_modified || 0) - (a.last_modified || 0));
  return candidates[0].name;
}

// Download a file from inventory storage as ArrayBuffer
export async function downloadInventoryFile(filename) {
  const { data, error } = await supabase.storage.from(INVENTORY_BUCKET).download(filename);
  if (error) throw error;
  return await data.arrayBuffer();
}

// Upload a file to inventory storage
export async function uploadInventoryFile(filename, fileBlob) {
  const { data, error } = await supabase.storage.from(INVENTORY_BUCKET).upload(filename, fileBlob, { upsert: true });
  if (error) throw error;
  return data;
}

// Export inventory to storage as both .csv and .xlsx
export async function exportInventoryToStorage(products, ingredients, modifiers) {
  // Combine all items into one array with headers
  const allItems = [...products, ...ingredients, ...modifiers];
  if (allItems.length === 0) return;
  const headers = Object.keys(allItems[0]);
  const rows = [headers, ...allItems.map(item => headers.map(h => item[h]))];

  // CSV
  const csv = Papa.unparse(rows);
  const csvBlob = new Blob([csv], { type: 'text/csv' });
  await uploadInventoryFile('inventory_export.csv', csvBlob);

  // XLSX
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const xlsxBlob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  await uploadInventoryFile('inventory_export.xlsx', xlsxBlob);
} 