import { useState } from "react";
import { Tray, Product } from "/src/handlers/DataHandler";

export default function useTrayManager() {
  const [tray, setTray] = useState([new Tray(0)]);
  const [currentTray, setCurrentTray] = useState(0);
  const [currentProduct, setCurrentProduct] = useState("");

  // Add a new tray
  const addNewTray = () => {
    setCurrentTray(prevKey => {
      const newKey = prevKey + 1;
      setTray(prevTrays => [...prevTrays, new Tray(newKey)]);
      return newKey;
    });
  };

  // Add product to tray
  const addToTray = (product) => {
    let productInstance = new Product(product.name, product.price, 1, product.code, product.contents);
    setTray(prevTray => 
      prevTray.map((trayObject, index) => {
        if (index === currentTray) {
          const existingProduct = trayObject.products.find(item => item.name === product.name);
          return existingProduct
            ? { ...trayObject, products: trayObject.products.map(item =>
                item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item
              ) }
            : { ...trayObject, products: [...trayObject.products, productInstance] };
        }
        return trayObject;
      })
    );
  };

  // Increment product quantity
  const handleProductIncrement = (productName) => {
    setTray(prevTray =>
      prevTray.map(trayObject => {
        if (trayObject.id === currentTray) {
          return { 
            ...trayObject, 
            products: trayObject.products.map(product => 
              product.name === productName ? { ...product, quantity: product.quantity + 1 } : product
            )
          };
        }
        return trayObject;
      })
    );
  };

  // Decrement product quantity
  const handleProductDecrement = (productName) => {
    setTray(prevTray =>
      prevTray.map(trayObject => {
        if (trayObject.id === currentTray) {
          return { 
            ...trayObject, 
            products: trayObject.products.map(product =>
              product.name === productName && product.quantity > 1 ? 
                { ...product, quantity: product.quantity - 1 } : product
            )
          };
        }
        return trayObject;
      })
    );
  };

  const addModifier = (modifier) => {
    if (!currentProduct) {
      console.log("No product selected");
      return;
    }
    // GPT OVERSIGHT
    // PRODUCT CLASSES ALREADY HAVE BUILTIN FUNCTIONS TO ADD/REMOVE MODIFIERS
    // THIS FUNCTION SHOULD BE REFACTORED TO USE THE PRODUCT CLASS METHODS
    setTray(prevTray =>
      prevTray.map(trayObject => {
        if (trayObject.id !== currentTray) return trayObject;
          const updatedProducts = trayObject.products.map(product => {
            // exit early if the product is not the current product
            if (product.name !== currentProduct) return product;
            // if an existing modifier is found, increment its quantity
            const updatedModifiers = product.modifiers.map(item =>
              item.name === modifier.name
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );

            const modifierExists = product.modifiers.some(item => item.name === modifier.name);

            return {
              ...product,
              modifiers: modifierExists
                ? updatedModifiers
                : [...product.modifiers, { ...modifier, quantity: 1 }]
            };
          });

          return { ...trayObject, products: updatedProducts };
        })
      );
      // better way to imbed information to a console string
    console.log(`Modifier "${modifier.name}" added to "${currentProduct}"`);
  };

  const handleModifierIncrement = (modifierName) => {
    setTray(prevTray =>
      prevTray.map(trayObject => {
        if (trayObject.id !== currentTray) return trayObject;
        const updatedProducts = trayObject.products.map(product => {
          // exit early if the product is not the current product
          if (product.name !== currentProduct) return product;
          const updatedModifiers = product.modifiers.map(modifier => 
            modifier.name === modifierName 
              ? {...modifier, quantity: modifier.quantity + 1} : modifier
          );
          return {
            ...product,
            modifiers: updatedModifiers
          };
        });
        return { ...trayObject, products: updatedProducts };
      })
    );
  };

  const handleModifierDecrement = (modifierName) => {
    setTray(prevTray =>
      prevTray.map(trayObject => {
        if (trayObject.id !== currentTray) return trayObject;
        const updatedProducts = trayObject.products.map(product => {
          // exit early if the product is not the current product
          if (product.name !== currentProduct) return product;
          const updatedModifiers = product.modifiers.map(modifier => 
            modifier.name === modifierName && modifier.quantity > 1
              ? {...modifier, quantity: modifier.quantity - 1} : modifier
          );
          return {
            ...product,
            modifiers: updatedModifiers
          };
        });
        return { ...trayObject, products: updatedProducts };
      })
    );
  };

  const handleModifierDeletion = (modifierName) => {
    setTray(prevTray =>
      prevTray.map(trayObject => {
        if (trayObject.id !== currentTray) return trayObject;
        const updatedProducts = trayObject.products.map(product => {
          // exit early if the product is not the current product
          if (product.name !== currentProduct) return product;
          // if an existing modifier is found, increment its quantity
          const updatedModifiers = product.modifiers.filter(modifier => modifier.name !== modifierName);
          return {
            ...product,
            modifiers: updatedModifiers
          };
        });
        return { ...trayObject, products: updatedProducts };
      })
    );
  };

  return {
    tray,
    currentTray,
    addNewTray,
    addToTray,
    handleProductIncrement,
    handleProductDecrement,
    addModifier,
    handleModifierIncrement,
    handleModifierDecrement,
    handleModifierDeletion,
    setCurrentTray,
    currentProduct,
    setCurrentProduct,
  };
}
