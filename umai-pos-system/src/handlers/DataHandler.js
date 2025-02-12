import ExcelJS from 'exceljs';

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
      console.log(productInstance.name);
      
      if (productType !== -1) {
        if ((productType !== -1)) {
          let includedContent = product.content.split(",");
          includedContent.forEach((code) => {
              let promoProd = products.find((p) => p.code === code);
              if (promoProd) {
                  let promoInstance = new PromoProduct(promoProd.name, 1);
                  productInstance.addPromo(promoInstance);
                  productInstance.setType("PROMO");
                  console.log("Promo: " + promoInstance.name);
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

  //function to append new entries
export async function appendEntry(filePath, newEntries) {
  const fileBuffer = await fetch(filePath).then((res) => res.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.getWorksheet(1);

  const lastRow = worksheet.lastRow;

  newEntries.forEach((entry) => {
    worksheet.addRow(entry); // Add each new row
  });

  const updatedExcelBuffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([updatedExcelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'UpdatedExcelFile.xlsx';
  link.click();
}