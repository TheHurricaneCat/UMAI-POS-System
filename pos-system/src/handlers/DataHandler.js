import ExcelJS from 'exceljs';
import { getSessionDetails, saveExcelFile } from './SessionHandler';

//////////////
// Bound to app.jsx
// initializes productlist from an array
// parses the product data and organizes it into categories
//////////////

export function initProductList(products = []) {
  let categories = [];
  products.forEach((product) => {
    // Find the category in the list
    let existingCategory = categories.find((category) => category.name === product.category);
    // make this dynamic somehow
    let productType = product.code.search("PR");
    let productInstance = new Product(product.name, product.price, 1, product.code);
    
    // detect for promo products
    if (productType !== -1) {
      if ((productType !== -1)) {
        let includedContent = product.content.split(",");
        includedContent.forEach((code) => {
            let promoProd = products.find((p) => p.code === code);
            if (promoProd) {
                let promoInstance = new PromoProduct(promoProd.name, 1);
                productInstance.addPromo(promoInstance);
                productInstance.setType("PROMO");
            }
        });
      }
    }

    if (existingCategory) {
      // Add included promo products with the product
      // Add the product to the existing category
      existingCategory.addProduct(productInstance);
    } else {
      // Create a new category, add the product, and push to the list
      let newCategory = new Category(product.category);
      newCategory.addProduct(productInstance);
      categories.push(newCategory);
    }
  });
  return categories;
}

export async function fetchFromLocalStorage(token) {
  console.log("[SESSION]  Fetching Excel file from local storage with token:", token);
  const base64Data = localStorage.getItem(token);
  if (!base64Data) {
    const filePathWeb = "/TestFile.xlsx";
      console.log("[SESSION]  Fetching Excel template from:", filePathWeb);
      const response = await fetch(filePathWeb);
      
      if (!response.ok) {
        throw new Error(`[SESSION]  Failed to fetch Excel file: ${response.status} ${response.statusText}`);
      }
      console.log('[SESSION]  Data has been fetched');
      return await response.arrayBuffer();
  } else {
    console.log('[SESSION]  Using cached data');
    const byteCharacters = atob(base64Data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    console.log('[SESSION]  Extracted .xlsx file from local storage:', byteArray);
    return byteArray.buffer;
  }
}

//////////////
// Bound to keypadviewer and app.jsx
// Function to save the Excel file
// revert to simpler version. Check old commit
//////////////

export async function appendEntry(newEntries, discount, discountedTotal) {
  // Check if there are any entries to append
  if (!newEntries || newEntries.length === 0) {
    console.warn("No entries to append to Excel file");
    return false;
  }

  // Check if any trays have products
  const hasProducts = newEntries.some(tray => tray.products && tray.products.length > 0);
  if (!hasProducts) {
    console.warn("No products found in any trays, skipping Excel update");
    return false;
  }

  try {
    const sessionDetails = await getSessionDetails();
    const sessionID = `session_${sessionDetails.token}`;
    console.log("Session ID:", sessionID);
    const cashierName = sessionDetails?.employee_id || "Unknown";
    
    const fileBuffer = await fetchFromLocalStorage(sessionID);

    const workbook = new ExcelJS.Workbook();
    
    // V point of error
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.error("[EXCEL]  No worksheet found in Excel file");
      return false;
    }
    
    // Find the last invoice number
    let lastInvoiceNumber = 0;
    let lastInvoiceRow = null;
    const today = new Date();
    const datePart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    try {
      for (let i = worksheet.rowCount; i > 0; i--) {
        const row = worksheet.getRow(i);
        // IMPORTANT ///////////////////////////////////////////////////
        // make this somehow adaptive in cases where the column index changes again
        const invoiceCell = row.getCell(6).value; // Assuming invoice number is in column 1
        console.log("[EXCEL]  Checking row:", i, "Invoice Cell:", invoiceCell);
        if (invoiceCell && typeof invoiceCell === 'string' && invoiceCell.includes('-')) {
          lastInvoiceRow = row;
          const lastInvoiceParts = invoiceCell.split('-');
          if (lastInvoiceParts.length >= 2) {
            lastInvoiceNumber = parseInt(lastInvoiceParts[3], 10);
            console.log("[EXCEL]  Found last invoice number extracted");
          }
          break;
        }
      }
    } catch (error) {
      console.error("[EXCEL]  Error finding last invoice:", error);
    }

    console.log("[EXCEL]  Last Invoice Number:", lastInvoiceNumber);
    let invoiceNumber = lastInvoiceNumber;

    newEntries.forEach((tray) => {
      invoiceNumber += 1;
      const invoice = `${datePart}-${String(invoiceNumber).padStart(5, '0')}`;
  
      tray.products.forEach((product) => {
        const productRow = [
          "PRODUCT",
          product.quantity,
          product.name,
          product.price,
          product.price * product.quantity,
          invoice,
          tray.customer.customerName,
          tray.customer.address,
          tray.customer.contactNumber,
          tray.customer.paymentMethod,
          cashierName
        ];
        worksheet.addRow(productRow);
  
        product.modifiers.forEach((modifier) => {
          const modifierRow = [
            "MODIFIER",
            modifier.quantity,
            modifier.name,
            modifier.price,
            modifier.price * modifier.quantity,
            invoice,
          ];
          worksheet.addRow(modifierRow);
        });
  
        product.content.forEach((content) => {
          const contentRow = [
            "PROMO",
            content.quantity,
            content.name,
            content.price,
            content.price * content.quantity,
            invoice,
          ];
          worksheet.addRow(contentRow);
        });

        if (discount) {
          const discountRow = [
            "DISCOUNT",
            discount.name,
            discount.value,
            discountedTotal,
            "-",
            invoice,
          ]
          worksheet.addRow(discountRow);
        }
      });
    });

    // If no rows were added, return false
    /* if (!rowsAdded) {
      console.warn("No rows were added to the Excel file");
      return false;
    } */

    // Save the updated workbook
    const updatedExcelBuffer = await workbook.xlsx.writeBuffer();
    
    // Web mode: Save to cache (or download)
    const blob = new Blob([updatedExcelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    
    // Return a promise to ensure we wait for the file to be saved
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        try {
          localStorage.setItem(sessionID, reader.result);
          console.log("File saved to cache with session ID:", sessionID);
          
          saveExcelFile();
          console.log("Excel file saved to Firebase Storage");
          
          /* // Force download (optional - can be configured based on parameter)
          const link = document.createElement("a");
          link.href = url;
          link.download = sessionID + ".xlsx";
          link.click(); */
          
          resolve(true); // Successfully saved
        } catch (error) {
          console.error("Error saving file to localStorage:", error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error("Error reading file data:", error);
        reject(error);
      };
    });
  } catch (error) {
    console.error("Error in appendEntry:", error);
    return false;
  }
}


//////////////
// Bound to transactionViewer page
// fetches all transactions from the Excel file
//////////////


export async function getTransactions() {
  try {
    const sessionDetails = getSessionDetails();
    if (!sessionDetails || !sessionDetails.token) {
      console.warn("[SESSION] No valid session details found");
      return [];
    }
    
    const sessionID = `session_${sessionDetails.token}`;
    console.log("[SESSION] Getting transactions from session ID:", sessionID);
    
    const fileBuffer = await fetchFromLocalStorage(sessionID);
    if (!fileBuffer) {
      console.warn("[SESSION] No Excel file found for this session");
      return [];
    }
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.error("[EXCEL] No worksheet found in Excel file");
      return [];
    }
    
    const transactions = [];
    
    // Iterate through the rows to collect transactions
    for (let i = 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowType = row.getCell(1).value; // Column A - Type (PRODUCT, MODIFIER, PROMO, DISCOUNT)
      
      if (rowType === "PRODUCT") {
        const invoiceNumber = row.getCell(6).value; // Column F - Invoice number
        const customerName = row.getCell(7).value || "-"; // Column G - Customer name
        const address = row.getCell(8).value || "-"; // Column H - Address
        const contactNumber = row.getCell(9).value || "-"; // Column I - Contact number
        const paymentMethod = row.getCell(10).value || "-"; // Column J - Payment method
        const cashierName = row.getCell(11).value || "-"; // Column K - Cashier name
        
        let transaction = transactions.find(t => t.invoiceNumber === invoiceNumber);
        
        if (!transaction) {
          transaction = {
            invoiceNumber: invoiceNumber,
            customerName: customerName,
            address: address,
            contactNumber: contactNumber,
            paymentMethod: paymentMethod,
            cashierName: cashierName,
            products: [],
            total: 0
          };
          transactions.push(transaction);
        }
        
        const quantity = row.getCell(2).value; // Column B - Quantity
        const name = row.getCell(3).value; // Column C - Name
        const price = row.getCell(4).value; // Column D - Price
        const total = row.getCell(5).value; // Column E - Total
        
        const product = {
          quantity: Number(quantity),
          name: name,
          price: Number(price),
          total: Number(total),
          modifiers: [],
          content: []
        };
        
        transaction.products.push(product);
        transaction.total += Number(total);
      } else if (rowType === "MODIFIER") {
        // Find the transaction this modifier belongs to
        const invoiceNumber = row.getCell(6).value;
        const transaction = transactions.find(t => t.invoiceNumber === invoiceNumber);
        
        if (transaction && transaction.products.length > 0) {
          // Add modifier to the last added product in this transaction
          const currentProduct = transaction.products[transaction.products.length - 1];
          
          const quantity = row.getCell(2).value;
          const name = row.getCell(3).value;
          const price = row.getCell(4).value;
          const total = row.getCell(5).value;
          
          currentProduct.modifiers.push({
            quantity: Number(quantity),
            name: name,
            price: Number(price),
            total: Number(total)
          });
        }
      } else if (rowType === "PROMO") {
        // Find the transaction this promo content belongs to
        const invoiceNumber = row.getCell(6).value;
        const transaction = transactions.find(t => t.invoiceNumber === invoiceNumber);
        
        if (transaction && transaction.products.length > 0) {
          // Add promo content to the last added product in this transaction
          const currentProduct = transaction.products[transaction.products.length - 1];
          
          const quantity = row.getCell(2).value;
          const name = row.getCell(3).value;
          const price = row.getCell(4).value;
          const total = row.getCell(5).value;
          
          currentProduct.content.push({
            quantity: Number(quantity),
            name: name,
            price: Number(price),
            total: Number(total)
          });
        }
      } else if (rowType === "DISCOUNT") {
        // Find the transaction this discount belongs to
        const invoiceNumber = row.getCell(6).value;
        const transaction = transactions.find(t => t.invoiceNumber === invoiceNumber);
        
        if (transaction) {
          const name = row.getCell(2).value;
          const value = row.getCell(3).value;
          const discountedTotal = row.getCell(4).value;
          
          transaction.discount = {
            name: name,
            value: Number(value)
          };
          transaction.discountedTotal = Number(discountedTotal);
        }
      }
    }
    
    console.log("[EXCEL] Retrieved transactions:", transactions);
    return transactions;
  } catch (error) {
    console.error("[EXCEL] Error retrieving transactions:", error);
    return [];
  }
}

//////////////
// Bound to receipt generation
// Function to \get the last transaction from the local excel
//////////////

export async function getLastTransaction() {
  try {
    const sessionDetails = getSessionDetails();
    if (!sessionDetails || !sessionDetails.token) {
      console.warn("[SESSION] No valid session details found");
      return null;
    }
    
    const sessionID = `session_${sessionDetails.token}`;
    console.log("[SESSION] Getting last transaction from session ID:", sessionID);
    
    const fileBuffer = await fetchFromLocalStorage(sessionID);
    if (!fileBuffer) {
      console.warn("[SESSION] No Excel file found for this session");
      return null;
    }
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.error("[EXCEL] No worksheet found in Excel file");
      return null;
    }
    
    // Get the last invoice number from the sheet
    let lastInvoiceNumber = "";
    let lastTransaction = {
      invoiceNumber: "",
      customerName: "",
      address: "",
      contactNumber: "",
      paymentMethod: "",
      cashierName: "",
      products: [],
      total: 0
    };
    
    // First pass: find the last invoice number
    // Update column indices to match those in appendEntry
    for (let i = worksheet.rowCount; i > 0; i--) {
      const row = worksheet.getRow(i);
      const invoiceCell = row.getCell(6).value; // Column F - Invoice number (changed from 5/E)
      
      if (invoiceCell && typeof invoiceCell === 'string' && invoiceCell.includes('-')) {
        lastInvoiceNumber = invoiceCell;
        lastTransaction.invoiceNumber = invoiceCell;
        lastTransaction.customerName = row.getCell(7).value || "-"; // Column G - Customer name
        lastTransaction.address = row.getCell(8).value || "-"; // Column H - Address
        lastTransaction.contactNumber = row.getCell(9).value || "-"; // Column I - Contact number
        lastTransaction.paymentMethod = row.getCell(10).value || "-"; // Column J - Payment method
        lastTransaction.cashierName = row.getCell(11).value || "-"; // Column K - Cashier name
        break;
      }
    }
    
    if (!lastInvoiceNumber) {
      console.warn("[EXCEL] No transactions found in the Excel file");
      return null;
    }
    
    // Second pass: collect all products with the last invoice number
    let currentProduct = null;
    
    for (let i = 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowType = row.getCell(1).value; // Column A - Type (PRODUCT, MODIFIER, PROMO, DISCOUNT)
      const invoiceCell = row.getCell(6).value; // Column F - Invoice number
      
      // If this row belongs to the last invoice
      if (invoiceCell === lastInvoiceNumber) {
        // For regular products
        if (rowType === "PRODUCT") {
          const quantity = row.getCell(2).value; // Column B - Quantity
          const name = row.getCell(3).value; // Column C - Name
          const price = row.getCell(4).value; // Column D - Price
          const total = row.getCell(5).value; // Column E - Total
          
          currentProduct = {
            quantity: Number(quantity),
            name: name,
            price: Number(price),
            total: Number(total),
            modifiers: [],
            content: []
          };
          lastTransaction.products.push(currentProduct);
          lastTransaction.total += Number(total);
        }
        // For modifiers
        else if (rowType === "MODIFIER" && currentProduct) {
          const quantity = row.getCell(2).value; // Column B - Quantity
          const name = row.getCell(3).value; // Column C - Name
          const price = row.getCell(4).value; // Column D - Price
          const total = row.getCell(5).value; // Column E - Total
          
          currentProduct.modifiers.push({
            quantity: Number(quantity),
            name: name,
            price: Number(price),
            total: Number(total)
          });
        }
        // For promo content
        else if (rowType === "PROMO" && currentProduct) {
          const quantity = row.getCell(2).value; // Column B - Quantity
          const name = row.getCell(3).value; // Column C - Name
          const price = row.getCell(4).value; // Column D - Price
          const total = row.getCell(5).value; // Column E - Total
          
          currentProduct.content.push({
            quantity: Number(quantity),
            name: name,
            price: Number(price),
            total: Number(total)
          });
        }
        // For discount (optional - if you want to include it in the receipt)
        else if (rowType === "DISCOUNT") {
          const name = row.getCell(2).value; // Column B - Discount name
          const value = row.getCell(3).value; // Column C - Discount value
          const discountedTotal = row.getCell(4).value; // Column D - Discounted total
          
          lastTransaction.discount = {
            name: name,
            value: Number(value)
          };
          lastTransaction.discountedTotal = Number(discountedTotal);
        }
      }
    }
    
    console.log("[EXCEL] Retrieved last transaction:", lastTransaction);
    return lastTransaction;
  } catch (error) {
    console.error("[EXCEL] Error retrieving last transaction:", error);
    return null;
  }
}

//////////////
// Bound to sessionViewer
// Function to void the last transaction
// Must be on a one-at-time transaction only basis
//////////////

export async function voidLastTransaction() {
  try {
    // Get session details
    const sessionDetails = getSessionDetails();
    if (!sessionDetails || !sessionDetails.token) {
      console.warn("[SESSION] No valid session details found for voiding transaction");
      return false;
    }
    
    const sessionID = `session_${sessionDetails.token}`;
    console.log("[SESSION] Attempting to void last transaction from session:", sessionID);
    
    // Fetch the Excel file
    const fileBuffer = await fetchFromLocalStorage(sessionID);
    if (!fileBuffer) {
      console.warn("[SESSION] No Excel file found for voiding transaction");
      return false;
    }
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.error("[EXCEL] No worksheet found in Excel file");
      return false;
    }
    
    // Find the last invoice number
    let lastInvoiceNumber = null;
    for (let i = worksheet.rowCount; i > 0; i--) {
      const row = worksheet.getRow(i);
      const invoiceCell = row.getCell(6).value; // Column F - Invoice number
      
      if (invoiceCell && typeof invoiceCell === 'string' && invoiceCell.includes('-')) {
        lastInvoiceNumber = invoiceCell;
        break;
      }
    }
    
    if (!lastInvoiceNumber) {
      console.warn("[EXCEL] No transactions found to void");
      return false;
    }
    
    console.log("[EXCEL] Found last invoice number for voiding:", lastInvoiceNumber);
    
    // Identify rows to remove (all rows with matching invoice number)
    const rowsToDelete = [];
    for (let i = 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const invoiceCell = row.getCell(6).value;
      
      if (invoiceCell === lastInvoiceNumber) {
        rowsToDelete.push(i);
      }
    }
    
    if (rowsToDelete.length === 0) {
      console.warn("[EXCEL] No rows found with the last invoice number");
      return false;
    }
    
    console.log("[EXCEL] Found", rowsToDelete.length, "rows to delete for invoice:", lastInvoiceNumber);
    
    // Delete rows in reverse order to avoid shifting issues
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      worksheet.spliceRows(rowsToDelete[i], 1);
    }
    
    console.log("[EXCEL] Removed rows for transaction with invoice:", lastInvoiceNumber);
    
    // Save the updated workbook
    const updatedExcelBuffer = await workbook.xlsx.writeBuffer();
    
    // Web mode: Save to cache
    const blob = new Blob([updatedExcelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    
    // Return a promise to ensure we wait for the file to be saved
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        try {
          localStorage.setItem(sessionID, reader.result);
          console.log("[EXCEL] File saved to cache after voiding transaction");
          
          resolve(true); // Successfully voided
        } catch (error) {
          console.error("[EXCEL] Error saving file after voiding:", error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error("[EXCEL] Error reading file data after voiding:", error);
        reject(error);
      };
    });
  } catch (error) {
    console.error("[EXCEL] Error voiding last transaction:", error);
    return false;
  }
}

//////////////
// Class declarations
//////////////


export class Modifier {
  constructor(name, price, quantity) {
    this.name = name;
    this.price = price;
    this.quantity = quantity;
  }

  increaseQuantity() {
    this.quantity += 1;
  }

  decreaseQuantity() {
    if (this.quantity <= 1) return; 
    this.quantity -= 1;
  }
}


export class Product {
  constructor(name, price, quantity, code) {
    this.name = name;
    this.price = price;
    this.quantity = quantity;
    this.code = code;
    this.modifiers = [];
    this.content = [];
    this.type;/*
    //console.log("After:" + this.type); //debug
    // example content = "P1,P2,P3,P4"
    if (this.type === "PROMO") {
      this.content = content.split(",");
      console.log("Content: " + this.content);
    } */
  }

  setType(type) {
    this.type = type;
  }

  addPromo(product) {
    this.content.push(product);
  }
}

export class PromoProduct {
  constructor(name, quantity/* , limit */) {
    this.name = name;
    this.quantity = quantity;
    //this.limit = limit;
  }
}

export class Category {
  constructor(name) {
    this.name = name;
    this.products = [];
  }

  addProduct(product) {
    this.products.push(product);
  }
}

export class Tray {
  constructor(id) {
    this.id = id;
    this.products = [];
    this.customer = { // Default values as dashed lines
      customerName: "-",
      address: "-",
      contactNumber: "-",
      paymentMethod: "-"
    };
  }

  addProduct(product) {
    this.products.push(product);
  }

  removeProduct(product) {
    this.products = this.products.filter((item) => item.name !== product.name);
  }

  setCustomer(customer) {
    this.customer = customer; // Store customer object inside the tray
  }
}

export class Customer {
  constructor(customerName, address, contactNumber, paymentMethod){
    this.customerName = customerName;
    this.address = address;
    this.contactNumber = contactNumber;
    this.paymentMethod = paymentMethod;
  }
}



