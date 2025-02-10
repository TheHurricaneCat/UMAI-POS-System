import { useState } from 'react'
import './App.css'
import {initProductList} from '/src/handlers/DataHandler'
import {products, modifiers} from '/src/handlers/Product.js'
import useTrayManager from '/src/handlers/UseTrayManagers.js'

import ProductCard from '/src/pos-components/ProductCard.jsx'
import CategoryContainer from './pos-components/CategoryContainer'
import TrayContainer from '/src/pos-components/TrayContainer.jsx'
import KeypadContainer from '/src/pos-components/KeypadContainer.jsx'

function App() {
  
  // IMPORTANT NOTE:
  // The following code is meant for the POS system
  // Create new interfaces (i.e. new .jsx components) that will house the other interfaces 

  const {
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
    setCurrentProduct
  } = useTrayManager();

  let productList = initProductList(products);
  let modifierList = initProductList(modifiers);
  
  return (
    // interfaces are invisible containers that hold the components
    // viewers are containers that displays a list of components (e.g. products, modifiers, trays)
    <div className="primaryInterface">
      <div className="productInterface"> 
        <div className="productViewer"> 
          {productList.map((category) => (
            <CategoryContainer category={category} type="product" 
            addToTray={addToTray}/>
          ))}
        </div>
        <div className="modifierViewer">
          {modifierList.map((category) => (
            <CategoryContainer category={category} type="modifier"
            addModifier={addModifier}
             />
          ))}
        </div>
      </div>
      <div className="trayInterface">
        <div className="trayViewer">
          {tray.map((content) => (
                <TrayContainer content={content} 
                handleProductIncrement={handleProductIncrement} 
                handleProductDecrement={handleProductDecrement} 
                handleProductDeletion={handleProductDeletion} 
                
                handleModifierIncrement={handleModifierIncrement} 
                handleModifierDecrement={handleModifierDecrement} 
                handleModifierDeletion={handleModifierDeletion}
                
                setCurrentTray={setCurrentTray}
                setCurrentProduct={setCurrentProduct} />
          ))}
        </div>
        <div className="keypadViewer"> 
          <KeypadContainer addNewTray={addNewTray}/>
        </div>
      </div>
    </div>
  )
}

export default App
