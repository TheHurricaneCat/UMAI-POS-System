import React, { useState } from 'react';
import './Inventory.css';
import { firestore } from '/firebase.js';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getSessionDetails } from '../handlers/SessionHandler';
import { recipeMap } from '../handlers/recipeMap';


function InvProductCard({ name, code, price, category, stockNumber, onStockUpdate }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newStock, setNewStock] = useState(stockNumber);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showMakeModal, setShowMakeModal] = useState(false);
    const [makeQuantity, setMakeQuantity] = useState(1);

    const handleStockUpdate = async () => {
        try {
            setIsUpdating(true);
            const sessionToken = getSessionDetails()?.token;
            if (!sessionToken) {
                console.error("No active session found");
                return;
            }
    
            const productsRef = collection(firestore, 'Products');
            const productQuery = name === 'Promo 2' 
                ? query(
                    productsRef,
                    where('sessionToken', '==', sessionToken),
                    where('category', '==', category)  // Use category for Promo 2
                )
                : query(
                    productsRef,
                    where('sessionToken', '==', sessionToken),
                    where('name', '==', name)
                );
            const productSnapshot = await getDocs(productQuery);
            
            if (!productSnapshot.empty) {
                const productDoc = productSnapshot.docs[0];
                await updateDoc(productDoc.ref, {
                    stockNumber: parseInt(newStock)
                });
                
                setToastMessage(`Successfully updated stock for ${name}`);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000); // Hide after 3 seconds
                
                if (onStockUpdate) {
                    onStockUpdate(false); // Pass false to prevent refresh toast
                }
                setShowModal(false);
            }
        } catch (error) {
            console.error("Error updating stock:", error);
            alert("Error updating stock");
        } finally {
            setIsUpdating(false);
        }
    };

    const makeProduct = async () => {
        try {
            setIsProcessing(true);
            const sessionToken = getSessionDetails()?.token;
            if (!sessionToken) {
                console.error("No active session found");
                return;
            }

            const recipe = recipeMap[name];
            if (!recipe) {
                setToastMessage(`No recipe found for ${name}`);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
                return;
            }

            // Check if we have enough ingredients
            const ingredientsRef = collection(firestore, 'Ingredients');
            for (const item of recipe) {
                const q = query(
                    ingredientsRef, 
                    where('sessionToken', '==', sessionToken),
                    where('name', '==', item.ingredient)
                );
                const snapshot = await getDocs(q);
                
                if (snapshot.empty) {
                    setToastMessage(`Ingredient ${item.ingredient} not found`);
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 3000);
                    return;
                }

                const ingredientDoc = snapshot.docs[0];
                const currentStock = ingredientDoc.data().stockNumber;
                const requiredAmount = item.amount * makeQuantity;
                
                if (currentStock < requiredAmount) {
                    setToastMessage(`Not enough ${item.ingredient}. Need ${requiredAmount}, have ${currentStock}`);
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 3000);
                    return;
                }
            }

            // Update ingredients stock
            for (const item of recipe) {
                const q = query(
                    ingredientsRef, 
                    where('sessionToken', '==', sessionToken),
                    where('name', '==', item.ingredient)
                );
                const snapshot = await getDocs(q);
                const ingredientDoc = snapshot.docs[0];
                const currentStock = ingredientDoc.data().stockNumber;
                
                await updateDoc(ingredientDoc.ref, {
                    stockNumber: currentStock - (item.amount * makeQuantity)
                });
            }

            // Increment product stock
            const productsRef = collection(firestore, 'Products');
            const productQuery = name === 'Promo 2'
                ? query(
                    productsRef,
                    where('sessionToken', '==', sessionToken),
                    where('category', '==', category)  // Use category for Promo 2
                )
                : query(
                    productsRef,
                    where('sessionToken', '==', sessionToken),
                    where('name', '==', name)
                );
            const productSnapshot = await getDocs(productQuery);
            
            if (!productSnapshot.empty) {
                const productDoc = productSnapshot.docs[0];
                await updateDoc(productDoc.ref, {
                    stockNumber: stockNumber + makeQuantity
                });
                setToastMessage(`Successfully made ${makeQuantity} ${name}`);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
                
                if (onStockUpdate) {
                    onStockUpdate(false); // Pass false to prevent refresh toast
                }
                setShowMakeModal(false);
                setMakeQuantity(1); // Reset quantity after successful make
            }

            

        } catch (error) {
            console.error("Error making product:", error);
            setToastMessage("Error making product");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="product-card">
                <h3>{name}</h3>
                <p>Code: {code}</p>
                <p>Price: ₱{price.toFixed(2)}</p>
                <p>Category: {category}</p>
                <p>Stock: {stockNumber}</p>
                <div className="card-buttons">
                    <button 
                        onClick={() => setShowModal(true)}
                        className="edit-button"
                    >
                        Edit Stock
                    </button>
                    <button 
                        onClick={() => setShowMakeModal(true)}
                        className="make-button"
                    >
                     Make Product
                    </button>
                </div>
            </div>

            

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Edit Stock - {name}</h3>
                        <div className="modal-body">
                            <label>
                                Stock Amount:
                                <input 
                                    type="number"
                                    value={newStock}
                                    onChange={(e) => setNewStock(e.target.value)}
                                    min="0"
                                />
                            </label>
                        </div>
                        <div className="modal-buttons">
                            <button onClick={() => setShowModal(false)}>Cancel</button>
                            <button 
                                onClick={handleStockUpdate} 
                                disabled={isUpdating}
                            >
                                {isUpdating ? 'Updating...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>

            )}

            {showMakeModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Make Product - {name}</h3>
                        <div className="modal-body">
                            <label>
                                Quantity to make:
                                <input 
                                    type="number"
                                    value={makeQuantity}
                                    onChange={(e) => setMakeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    min="1"
                                    className="quantity-input"
                                />
                            </label>
                            <p>This will:</p>
                            <ul>
                                <li>Use {makeQuantity}x the required ingredients</li>
                                <li>Increase product stock by {makeQuantity}</li>
                            </ul>
                        </div>
                        <div className="modal-buttons">
                            <button onClick={() => {
                                setShowMakeModal(false);
                                setMakeQuantity(1); // Reset quantity when closing
                            }}>Cancel</button>
                            <button 
                                onClick={makeProduct}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Making...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showToast && (
            <div className="toast-notification">
                {toastMessage}
            </div>
            )}

        </>

        
    );
}    

export default InvProductCard;