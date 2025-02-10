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