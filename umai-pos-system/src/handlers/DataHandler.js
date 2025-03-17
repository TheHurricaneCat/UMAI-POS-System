import ExcelJS from 'exceljs';
import { getSessionDetails, saveExcelFile } from './SessionHandler';
import { firestore } from '/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';


// class functions are useless
// since react does not prefer having their objects to change (states)
// So it wants to create a new object instead of changing the existing one


export async function fetchSessionItems(collectionName, sessionToken) {
  try {
    console.log(`Attempting to fetch ${collectionName} with sessionToken:`, sessionToken);
    const collectionRef = collection(firestore, collectionName);
    const q = query(collectionRef, where('sessionToken', '==', sessionToken));
    const querySnapshot = await getDocs(q);
    
    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Fetched ${items.length} ${collectionName}:`, items);
    return items;
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return [];
  }
}


export function initProductList(products = []) {
  let categories = [];
  products.forEach((product) => {
    // Find the category in the list
    let existingCategory = categories.find((category) => category.name === product.category);
    let productType = product.code.search("PR");
    let productInstance = new Product(product.name, product.price, 1);
    
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

//check if current instance is in web or standalone
function isElectron() {
  console.log("Detecting Electron: " + window && window.process && window.process.type);
  return window && window.process && window.process.type;
}

export async function fetchFromLocalStorage(token) {
  console.log("Fetching Excel file from local storage with token:", token);
  const base64Data = localStorage.getItem(token);
  if (!base64Data) {
    const filePathWeb = "/TestFile.xlsx";
      console.log("Fetching Excel template from:", filePathWeb);
      const response = await fetch(filePathWeb);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
      }
      console.log('Data has been fetched');
      return await response.arrayBuffer();
  } else {
    console.log('Using cached data');
    const byteCharacters = atob(base64Data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    console.log('Extracted .xlsx file from local storage:', byteArray);
    return byteArray.buffer;
  }
}

// Function to save the Excel file
export async function appendEntry(newEntries) {
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
    console.log("Session details: [NEW]", sessionDetails);

    const sessionID = `session_${sessionDetails.token}`;
    console.log("Session ID:", sessionID);
    const cashierName = sessionDetails?.employeeID || "Unknown";
    
    const fileBuffer = await fetchFromLocalStorage(sessionID);
    const workbook = new ExcelJS.Workbook();
    
    
    
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.error("No worksheet found in Excel file");
      return false;
    }
    

    // Find the last invoice number
    let lastInvoiceNumber = 0;
    let lastInvoiceRow = null;
    
    try {
      for (let i = worksheet.rowCount; i > 0; i--) {
        const row = worksheet.getRow(i);
        const invoiceCell = row.getCell(1).value; // Assuming invoice number is in column 1
        if (invoiceCell && typeof invoiceCell === 'string' && invoiceCell.includes('-')) {
          lastInvoiceRow = row;
          const lastInvoiceParts = invoiceCell.split('-');
          if (lastInvoiceParts.length === 2) {
            lastInvoiceNumber = parseInt(lastInvoiceParts[1], 10);
          }
          break;
        }
      }
    } catch (error) {
      console.error("Error finding last invoice:", error);
    }

    console.log("Last Invoice Number:", lastInvoiceNumber);

    // Generate the date part for the invoice
    const today = new Date();
    const datePart = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}${today.getFullYear()}`;
    let invoiceNumber = lastInvoiceNumber;
    
    // Format the current date and time
    const dateTime = today.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    // Flag to track if any rows were added
    let rowsAdded = false;
    
    // Process each tray (order)
    newEntries.forEach((tray) => {
      // Skip empty trays
      if (!tray.products || tray.products.length === 0) {
        console.log("Skipping empty tray");
        return;
      }

      invoiceNumber += 1;
      const invoice = `${datePart}-${String(invoiceNumber).padStart(5, '0')}`;
      const orderType = "Dine-in"; // Default value, could be parameterized later
      const defaultTax = 0.12; // 12% tax

      // Process each product in the tray
      tray.products.forEach((product) => {
        // Skip invalid products
        if (!product || !product.name) {
          console.log("Skipping invalid product");
          return;
        }
        
        // Calculate the product's subtotal
        const productSubtotal = product.price * product.quantity;
        
        // Find the highest discount rate from modifiers (if any)
        let highestDiscount = 0;
        if (product.modifiers && product.modifiers.length > 0) {
          product.modifiers.forEach(modifier => {
            if (modifier && modifier.price < 0) {
              const discountRate = -modifier.price * modifier.quantity;
              highestDiscount = Math.max(highestDiscount, discountRate);
            }
          });
        }
        
        // Calculate the discount amount
        const discountAmount = productSubtotal * highestDiscount;
        
        // Calculate tax and grand total
        const preTaxAmount = productSubtotal - discountAmount;
        const taxAmount = preTaxAmount * defaultTax;
        const grandTotal = preTaxAmount + taxAmount;
        
        // Create the row with the column format
        const productRow = [
          invoice,                               // Invoice number
          dateTime,                              // Date & time
          cashierName,                           // Cashier name
          orderType,                             // Order type
          product.name,                          // Product name
          product.code || "-",                   // Product code
          product.category || "-",               // Category
          product.quantity,                      // Qty sold
          product.price,                         // Unit price
          highestDiscount ? (highestDiscount * 100).toFixed(2) + "%" : "0%", // Discount
          (defaultTax * 100).toFixed(0) + "%",   // Tax (default 12%)
          grandTotal.toFixed(2),                 // Grand total
          tray.customer?.paymentMethod || "-",   // Payment method
          tray.customer?.customerName || "-",    // Customer name
        ];
        
        worksheet.addRow(productRow);
        rowsAdded = true;

        // Add modifier information in nested rows if needed
        if (product.modifiers && product.modifiers.length > 0) {
          product.modifiers.forEach((modifier) => {
            if (!modifier || !modifier.name) return;
            
            // Format can be adjusted as needed - here we're adding indented modifier info
            const modifierRow = [
              "",                                // No invoice number for modifier rows
              "",                                // No date/time
              "",                                // No cashier
              "",                                // No order type
              `${modifier.name}`,           // Indent modifier name
              "",                                // No product code
              "Modifier",                        // Category
              modifier.quantity,                 // Qty
              modifier.price,                    // Unit price
              "",                                // No additional discount
              "",                                // No additional tax
              (modifier.price * modifier.quantity).toFixed(2), // Subtotal
              "",                                // No payment method
              "",                                // No customer name
            ];
            
            worksheet.addRow(modifierRow);
            rowsAdded = true;
          });
        }

        // Add promo product information if it's a promo
        if (product.content && product.content.length > 0) {
          product.content.forEach((content) => {
            if (!content) return;
            
            const contentRow = [
              "",                                // No invoice number for content rows
              "",                                // No date/time
              "",                                // No cashier
              "",                                // No order type
              `  ↳ ${content.name || "Included Item"}`, // Indent included item name
              "",                                // No product code
              "Included Item",                   // Category
              content.quantity || 1,            // Qty
              content.price || "0.00",           // Unit price (likely 0 for included items)
              "",                                // No additional discount
              "",                                // No additional tax
              "0.00",                            // Typically 0 for included items
              "",                                // No payment method
              "",                                // No customer name
            ];
            
            worksheet.addRow(modifierRow);
            rowsAdded = true;
          });
        }
      });
    });

    // If no rows were added, return false
    if (!rowsAdded) {
      console.warn("No rows were added to the Excel file");
      return false;
    }

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
          
          // Force download (optional - can be configured based on parameter)
          const link = document.createElement("a");
          link.href = url;
          link.download = sessionID + ".xlsx";
          link.click();
          
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
  constructor(name, price, quantity) {
    this.name = name;
    this.price = price;
    this.quantity = quantity;
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



