import { useState, useEffect } from "react";
import { Tray, Product } from "/src/handlers/DataHandler";

export default function useTrayManager() {
  const [tray, setTray] = useState([new Tray(0)]);
  const [currentTray, setCurrentTray] = useState(0);
  const [currentProduct, setCurrentProduct] = useState("");
  const [currentTotal, setTotal] = useState(0);

  const updateTotal = () => {
    let total = 0;
    tray.forEach(trayObject => {
      trayObject.products.forEach(product => {
        total += product.price * product.quantity;
        product.modifiers.forEach(modifier => {
          if (modifier.price < 0) {
            //discounted = t - td
            total = total - (total * (-modifier.price * modifier.quantity));
          } else {
            total += modifier.price * modifier.quantity;
          }
          
        });
      });
    });
    setTotal(total);
    return currentTotal;
  }

  useEffect(() => {
    updateTotal();
  }, [tray]);

  // Add a new tray
  const addNewTray = () => {
    setTray(prevTrays => {
      const newKey = prevTrays.length;
      return [...prevTrays, new Tray(newKey)];
    });
  
    setCurrentTray(prev => prev + 1);
  };

  // Add product to tray
  const addToTray = (product) => {
    //let productInstance = new Product(product.name, product.price, 1, product.code, product.content);
    setTray(prevTray => 
      prevTray.map((trayObject, index) => {
        if (index === currentTray) {
          const existingProduct = trayObject.products.find(item => item.name === product.name);
          return existingProduct
            ? { ...trayObject, products: trayObject.products.map(item =>
                item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item
              ) }
            : { ...trayObject, products: [...trayObject.products, product] };
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

  const handleProductDeletion = (productName) => {
    setTray(prevTray => {
      return prevTray.map(trayObject => {
        if (trayObject.id === currentTray) {
          const updatedProducts = trayObject.products.filter(product => product.name !== productName);
          return { ...trayObject, products: updatedProducts };
        }
        return trayObject;
      });
    });
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
    handleProductDeletion,
    addModifier,
    handleModifierIncrement,
    handleModifierDecrement,
    handleModifierDeletion,
    setCurrentTray,
    currentProduct,
    currentTotal,
    setCurrentProduct,
  };
}
