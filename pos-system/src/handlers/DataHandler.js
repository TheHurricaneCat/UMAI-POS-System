import ExcelJS from 'exceljs';
import { getSessionDetails, saveExcelFile } from './SessionHandler';
/* import { firestore } from '/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore'; */


// class functions are useless
// since react does not prefer having their objects to change (states)
// So it wants to create a new object instead of changing the existing one

// todo:
// remove firebase functions

/* export async function fetchSessionItems(collectionName, sessionToken) {
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
 */

export function initProductList(products = []) {
  let categories = [];
  products.forEach((product) => {
    // Find the category in the list
    let existingCategory = categories.find((category) => category.name === product.category);
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

// Function to save the Excel file
// revert to simpler version. Check old commit
export async function appendEntry(newEntries, discount) {
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
    const cashierName = sessionDetails?.employeeID || "Unknown";
    
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
      console.error("[EXCEL]  Error finding last invoice:", error);
    }

    console.log("[EXCEL]  Last Invoice Number:", lastInvoiceNumber);
    let invoiceNumber = lastInvoiceNumber;

    newEntries.forEach((tray) => {
      invoiceNumber += 1;
      const invoice = `${datePart}-${String(invoiceNumber).padStart(5, '0')}`;
  
      tray.products.forEach((product) => {
        const productRow = [
          product.quantity,
          product.name,
          product.price,
          product.price * product.quantity,
          invoice,
          tray.customer.customerName,
          tray.customer.address,
          tray.customer.contactNumber,
          tray.customer.paymentMethod,
        ];
        worksheet.addRow(productRow);
  
        product.modifiers.forEach((modifier) => {
          const modifierRow = [
            null,
            modifier.quantity,
            modifier.name,
            `${modifier.price} >> ${modifier.price * modifier.quantity}`,
          ];
          worksheet.addRow(modifierRow);
        });
  
        product.content.forEach((content) => {
          const contentRow = [
            null,
            content.quantity,
            content.name,
            `${content.price} > ${content.price * content.quantity}`,
          ];
          worksheet.addRow(contentRow);
        });
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



