import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Inventory.css';
import '../handlers/SessionHandler.js';
import { supabase } from '../database/supabase.js';
import { initProductList, fetchSessionItems } from '../handlers/DataHandler';
import { getSessionDetails } from '../handlers/SessionHandler.js';
import InvProductCard from './InvProductCard.jsx';
import IngredientCard from './IngredientCard';

function Inventory() {
    const navigate = useNavigate();
    const [stockStatus, setStockStatus] = useState('Normal');
    const [stockDescription, setStockDescription] = useState('All ingredients are at adequate levels');
    const [products, setProducts] = useState([]);
    const [sauceModifiers, setSauceModifiers] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const getStockStatus = (stockNumber) => {
      if (stockNumber > 70) return 'high';
      if (stockNumber >= 30) return 'medium';
      return 'low';
    };

    const calOverallStockStatus = (ingredients, sauceModifiers) => {
      const allItems = [...ingredients, ...sauceModifiers];
      if (allItems.length === 0) return { status: 'No Data', description: 'No inventory data available' };
  
      const totalItems = allItems.length;
      const stockLevels = allItems.reduce((acc, item) => {
          if (item.stockNumber > 70) acc.high++;
          else if (item.stockNumber >= 30) acc.medium++;
          else acc.low++;
          return acc;
      }, { high: 0, medium: 0, low: 0 });
  
      // Calculate percentages
      const highPercentage = (stockLevels.high / totalItems) * 100;
      const lowPercentage = (stockLevels.low / totalItems) * 100;
  
      // Status logic
      if (highPercentage >= 70) {
          return {
              status: 'High',
              description: 'Stock levels are healthy across most items'
          };
      } else if (lowPercentage >= 30) {
          return {
              status: 'Critical',
              description: `${stockLevels.low} items need immediate attention`
          };
      } else if (highPercentage >= 40) {
          return {
              status: 'Medium',
              description: 'Stock levels are adequate but some items need attention'
          };
      } else {
          return {
              status: 'Low',
              description: 'Many items need restocking soon'
          };
      }
    };

    useEffect(() => {
      const { status, description } = calOverallStockStatus(ingredients, sauceModifiers);
      setStockStatus(status);
      setStockDescription(description);
    }, [ingredients, sauceModifiers]);

    useEffect(() => {
      async function fetchData() {
        try {
          const sessionDetails = getSessionDetails();
          console.log("Session Details:", sessionDetails);
          
          if (sessionDetails?.token) {
            console.log("Fetching with token:", sessionDetails.token);
            const productData = await fetchSessionItems('Products', sessionDetails.token);
            const modifierData = await fetchSessionItems('Modifiers', sessionDetails.token);
            const ingredientData = await fetchSessionItems('Ingredients', sessionDetails.token); // Add this line
            console.log("Product Data:", productData);
            console.log("Modifier Data:", modifierData);
            console.log("Ingredient Data:", ingredientData); // Add this line
            
            const sauces = modifierData.filter(mod => mod.category === "Sauce");

            if (productData.length > 0) {
              setProducts(productData);
            }
            if (modifierData.length > 0) {
              setSauceModifiers(sauces);
            }
            if (ingredientData.length > 0) { // Add this block
              setIngredients(ingredientData);
            }
          } else {
            console.error("No session token found");
          }
            
        } catch (error) {
          console.error("Error fetching inventory data:", error);
        }
      }
      fetchData();
    }, []);

    const refreshInventory = async (showToastMessage = false) => {
      try {
          const sessionDetails = getSessionDetails();
          if (sessionDetails?.token) {
              const productData = await fetchSessionItems('Products', sessionDetails.token);
              const modifierData = await fetchSessionItems('Modifiers', sessionDetails.token);
              const ingredientData = await fetchSessionItems('Ingredients', sessionDetails.token);
              
              setProducts(productData);
              setSauceModifiers(modifierData.filter(mod => mod.category === "Sauce"));
              setIngredients(ingredientData);
  
              // Add toast notification

              const { status, description } = calOverallStockStatus(ingredients, sauceModifiers);
              setStockStatus(status);
              setStockDescription(description);

              if (showToastMessage) {
                setToastMessage('Inventory refreshed successfully');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
              }
          }
      } catch (error) {
          console.error("Error refreshing inventory:", error);
          if (showToastMessage) {  // Only show error toast if showToastMessage is true
            setToastMessage('Error refreshing inventory');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
      }
    };

    const handleRefillStocks = async () => {
      try {
        const sessionDetails = getSessionDetails();
        if (!sessionDetails?.token) {
          console.error("No active session found");
          return;
        }
    
        // Update Products
        const { error: prodError } = await supabase
          .from('Products')
          .update({ stockNumber: 100 })
          .eq('sessionToken', sessionDetails.token);
    
        // Update Modifiers (Sauce only)
        const { error: modError } = await supabase
          .from('Modifiers')
          .update({ stockNumber: 100 })
          .eq('sessionToken', sessionDetails.token)
          .eq('category', 'Sauce');
    
        // Update Ingredients
        const { error: ingError } = await supabase
          .from('Ingredients')
          .update({ stockNumber: 100 })
          .eq('sessionToken', sessionDetails.token);
    
        if (prodError || modError || ingError) {
          throw prodError || modError || ingError;
        }
    
        await refreshInventory(true);
        setToastMessage('All stocks have been refilled to 100');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
        console.error("Error refilling stocks:", error);
        setToastMessage('Error refilling stocks');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    };

    return (
        <div className="inventory-container">
          <div className="inventory-header">
            <h1>Inventory Management</h1>
            <div className="button-group">
              <button onClick={() => navigate('/app')} className="nav-button pos">POS</button>
              <button onClick={() => navigate('/statistics')} className="nav-button inventory">Statistics</button>
            </div>
          </div>
    
          <div className="inventory-controls">
            <div className="control-group">
            <button className="control-button" onClick={handleRefillStocks}>Refill Stocks</button>
              <button className="control-button">Update System</button>
            </div>
            
            <div className="control-group">
              <button className="control-button">Call Supplier</button>
              <button className="control-button">Update Supplier</button>
            </div>
            
            <div className="control-group">
              <button className="control-button">Print Order Details</button>
              <button className="control-button">Rearrange View</button>
            </div>
    
            <div className="stock-status">
              <h3>Stock Status: <span className={`status ${stockStatus.toLowerCase()}`}>{stockStatus}</span></h3>
              <p>{stockDescription}</p>
            </div>
          </div>
    
          <div className="inventory-content-container">
            <div className="main-content-layout">
              <div className="products-ingredients-section">
                <div className="content-section">
                  <h2>Products</h2>
                  <div className="card-grid">
                      {products.length > 0 ? (
                        products.map((product) => (
                          <InvProductCard
                              key={product.id}
                              name={product.name}
                              code={product.code}
                              price={product.price}
                              category={product.category}
                              stockNumber={product.stockNumber}
                              onStockUpdate={refreshInventory}
                          />
                        ))
                      ) : (
                          <p>No products found</p>
                      )}
                  </div>
                </div>

                <div className="content-section">
                    <h2>Ingredients</h2>
                    <div className="card-grid">
                      {/* Display Ingredients */}
                      {ingredients.length > 0 && ingredients.map((ingredient) => (
                            <IngredientCard
                                key={`ing-${ingredient.id}`}
                                name={ingredient.name}
                                code={ingredient.code}
                                price={ingredient.price}
                                category={ingredient.category}
                                stockNumber={ingredient.stockNumber}
                                onStockUpdate={refreshInventory}
                            />
                        ))}
                        
                        {/* Display Sauce Modifiers */}
                        {sauceModifiers.length > 0 && sauceModifiers.map((sauce) => (
                            <IngredientCard
                                key={`sauce-${sauce.id}`}
                                name={sauce.name}
                                code={sauce.code}
                                price={sauce.price}
                                category={sauce.category}
                                stockNumber={sauce.stockNumber}
                                onStockUpdate={refreshInventory}
                            />
                        ))}
                        
                        {/* Show message if no items found */}
                        {ingredients.length === 0 && sauceModifiers.length === 0 && (
                            <p>No ingredients or sauces found</p>
                        )}

                        {showToast && (
                            <div className="toast-notification">
                                {toastMessage}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="stock-levels-section">
            <h2>Stock Levels</h2>
            <div className="stock-levels-card">
                <h3>Ingredients Status</h3>
                <div className="ingredients-list">
                    {/* Show all ingredients */}
                    {ingredients.map((ingredient) => (
                        <div key={ingredient.id} className="ingredient-status">
                            <span>{ingredient.name}</span>
                            <span className={`status-indicator ${getStockStatus(ingredient.stockNumber)}`}>
                                {getStockStatus(ingredient.stockNumber).charAt(0).toUpperCase() + 
                                getStockStatus(ingredient.stockNumber).slice(1)}
                            </span>
                        </div>
                    ))}
                    
                    {/* Show all sauce modifiers */}
                    {sauceModifiers.map((sauce) => (
                        <div key={sauce.id} className="ingredient-status">
                            <span>{sauce.name}</span>
                            <span className={`status-indicator ${getStockStatus(sauce.stockNumber)}`}>
                                {getStockStatus(sauce.stockNumber).charAt(0).toUpperCase() + 
                                getStockStatus(sauce.stockNumber).slice(1)}
                            </span>
                        </div>
                    ))}

                    {/* Show message if no items */}
                    {ingredients.length === 0 && sauceModifiers.length === 0 && (
                        <div className="ingredient-status">
                            <span>No ingredients found</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="stock-levels-buttons">
            <button className="stock-button" onClick={() => refreshInventory(true)}>Refresh Inventory</button>
                <button className="stock-button">Sort</button>
            </div>
          </div>
        </div>
      </div>
        </div>
      );
    }

export default Inventory;