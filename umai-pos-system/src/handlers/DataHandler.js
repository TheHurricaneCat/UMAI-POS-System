import ExcelJS from 'exceljs';
import { getSessionDetails } from './SessionHandler';
// class functions are useless
// since react does not prefer having their objects to change (states)
// So it wants to create a new object instead of changing the existing one

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
  }

  addProduct(product) {
    this.products.push(product);
  }

  removeProduct(product) {
    this.products = this.products.filter((item) => item.name !== product.name);
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
  
  let filePath = "C:/Users/Josefe Gillego/Documents/TestFile.xlsx";
  let filePathWeb = "/public/TestFile.xlsx";

  function fetchFromLocalStorage() {
    const base64Data = localStorage.getItem('excelFile');
    if (!base64Data) {
      console.error('No cached data found... using default public data');
      return fetch(filePathWeb).then((res) => res.arrayBuffer());
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
    const fileBuffer = await fetchFromLocalStorage();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
  
    const worksheet = workbook.getWorksheet(1);
    const sessionDetails = await getSessionDetails();
    const sessionID = sessionDetails.token;

    // Find the last row in the worksheet
    
    let lastInvoiceNumber = 0;
    let lastInvoiceRow = null;
    
    try {
      for (let i = worksheet.rowCount; i > 0; i--) {
        const row = worksheet.getRow(i);
        const invoiceCell = row.getCell(5).value;
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
      console.error(error);
    }

    console.log("Last Invoice Number: " + lastInvoiceNumber);

    const today = new Date();
    const datePart = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}${today.getFullYear()}`;
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
        ];
        worksheet.addRow(productRow);
  
        product.modifiers.forEach((modifier) => {
          const modifierRow = [
            null,
            modifier.quantity,
            modifier.name,
            `${modifier.price} > ${modifier.price * modifier.quantity}`,
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
  
    const updatedExcelBuffer = await workbook.xlsx.writeBuffer();
  
    if (isElectron()) {
      // Electron mode: Save to a local folder
      const fs = window.require("fs");
      const path = window.require("path");
      const os = window.require("os");
  
      const savePath = path.join(os.homedir(), "Documents", "Testfile.xlsx");
  
      fs.writeFileSync(savePath, Buffer.from(updatedExcelBuffer));
      alert(`File saved to ${savePath}`);
    } else {
      // Web mode: Save to cache (or download)
      const blob = new Blob([updatedExcelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        localStorage.setItem(sessionID, reader.result);
        console.log("File saved to cache");
      };
  
      // Force download (if needed)
      const link = document.createElement("a");
      link.href = url;
      link.download = sessionID.concat(".xlsx");
      link.click();
    }
  }