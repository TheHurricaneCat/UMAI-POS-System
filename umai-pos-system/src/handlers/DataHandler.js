import ExcelJS from 'exceljs';

export class Modifier {
  constructor(name, price, quantity) {
    this.name = name;
    this.price = price;
    this.quantity = quantity;
  }
}

export class Product {
  constructor(name, price, quantity, type, contents) {
    this.name = name;
    this.price = price;
    this.quantity = quantity;
    this.modifiers = [];
    /* console.log("Before:" + type); //debug */
    this.type = (type.search("PR") !== -1) ? "PROMO" : "PRODUCT";
    /* console.log("After:" + this.type); //debug */
    // example content = "P1,P2,P3,P4"
    /* this.contents = contents.split(","); */

    // reenable later ^^^
  }

  increaseQuantity() {
    this.quantity += 1;
  }

  decreaseQuantity() {
    this.quantity -= 1;
  }

  addModifier(modifier) {
    this.modifiers.push(modifier);
  }

  removeModifier(modifier) { 
    this.modifiers = this.modifiers.filter((item) => item.name !== modifier.name);
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
  
      if (existingCategory) {
        // Add the product to the existing category
        existingCategory.addProduct(product);
      } else {
        // Create a new category, add the product, and push to the list
        let newCategory = new Category(product.category);
        newCategory.addProduct(product);
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