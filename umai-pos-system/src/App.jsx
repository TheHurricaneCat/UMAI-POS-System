import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import './App.css'

import {initProductList, appendEntry} from './handlers/DataHandler'
import {products, modifiers} from './handlers/product.js'
import useTrayManager from './handlers/UseTrayManagers.js'

import ProductCard from './pos-components/ProductCard.jsx'
import CategoryContainer from './pos-components/CategoryContainer'
import TrayContainer from './pos-components/TrayContainer.jsx'
import KeypadContainer from './pos-components/KeypadContainer.jsx'
import CategoryMenu from './pos-components/CategoryMenu.jsx'
import Inventory from './inventory-components/Inventory.jsx'

  

import { startSession, getSessionDetails, endSession, saveExcelFile } from './handlers/SessionHandler';
  function App() {
 
  // IMPORTANT NOTE:
// The following code is meant for the POS system
// Create new interfaces (i.e. new .jsx components) that will house the other interfaces 
  const {
    tray,
    currentTray,
addNewTray,
    addToTray,
clearTray,
    clearCurrentTray,
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
    handleScrollToCategory,
    categoryRefs,
    saveCustomerToTray,  
  } = useTrayManager();

  const navigate = useNavigate();

  const handleSaveOrder = async () => {
    const sessionDetails = getSessionDetails();
    await appendEntry(tray, sessionDetails);
    clearCurrentTray();
  };

  let productList = initProductList(products);
  let modifierList = initProductList(modifiers);

  const testEmployee = "TestEmployee2";

	return (
    // interfaces are invisible containers that hold the components
    // viewers are containers that displays a list of components (e.g. products, modifiers, trays)
    <div className="primaryInterface">
      <div className="logo1"> </div>
      <div className="logo2"> </div>
      <div className="logo3"> </div>
      <div className="headerButtons"> 
      <button className="header-button session-start" onClick={() => startSession(testEmployee)}>
          Start Session
        </button>
        <button className="header-button session-end" onClick={() => endSession(testEmployee)}>
          End Session
        </button>
        <button className="header-button excel" onClick={() => saveExcelFile()}>
          Save Excel
        </button>
        <button className="header-button inventory" onClick={() => navigate('/inventory')}>
          Inventory
        </button>
        <button className="header-button statistics" onClick={() => navigate('/statistics')}>
          Statistics
        </button>
      </div>
      <div className="posInterface">
        <div className="productInterface"> 
          <CategoryMenu 
            productList={productList} 
            handleScrollToCategory={handleScrollToCategory}
          />
          <div className="productViewer"> 
            {productList.map((category, index) => (
              <CategoryContainer 
              category={category} 
              type="product" 
              addToTray={addToTray}
              categoryRefs={categoryRefs}
              index={index}/>
            ))}
          </div>
          <CategoryMenu 
            productList={modifierList} 
            handleScrollToCategory={handleScrollToCategory}
          />
          <div className="modifierViewer">
            {modifierList.map((category, index) => (
              <CategoryContainer 
                category={category} 
                type="modifier"
                addModifier={addModifier}
                categoryRefs={categoryRefs}
                index={index}
                />
            ))}
          </div>
        </div>
        <div className="trayInterface">
          <div className="trayHeader"> 
            <h4> Qty </h4>
            <h4> Img </h4>
            <h4> Item Name </h4>
            <h4> Total Price </h4>
          </div>
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
                  setCurrentProduct={setCurrentProduct}
                  
                  currentProduct={currentProduct}
                  currentTray={currentTray}
                  saveCustomerToTray={saveCustomerToTray}

                  />
            ))}
          </div>
          <div className="keypadViewer"> 
            <KeypadContainer 
              addNewTray={addNewTray} 
              currentTotal={currentTotal} 
              appendEntry={handleSaveOrder} 
              tray={tray} 
              clearTray={clearTray} 
              clearCurrentTray={clearCurrentTray}
              currentTray={currentTray}/>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
