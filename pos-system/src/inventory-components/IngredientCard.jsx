import React, { useState } from "react";
import "./Inventory.css";
import { supabase } from '../database/supabase';
import { getSessionDetails } from '../handlers/SessionHandler';

function IngredientCard({ name, code, price, category, stockNumber, onStockUpdate }) {
    const [showModal, setShowModal] = useState(false);
    const [newStock, setNewStock] = useState(stockNumber);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const handleStockUpdate = async () => {
        try {
            setIsUpdating(true);
            const sessionToken = getSessionDetails()?.token;
            if (!sessionToken) {
                console.error("No active session found");
                return;
            }

            // Update ingredient stock in Supabase
            const { data: ingredientRows, error } = await supabase
                .from('Ingredients')
                .select('*')
                .eq('sessionToken', sessionToken)
                .eq('name', name);
            if (error || !ingredientRows || ingredientRows.length === 0) {
                setToastMessage(`Ingredient ${name} not found`);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
                return;
            }
            const ingredientDoc = ingredientRows[0];
            await supabase
                .from('Ingredients')
                .update({ stockNumber: parseInt(newStock) })
                .eq('id', ingredientDoc.id);
            
            setToastMessage(`Successfully updated stock for ${name}`);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            
            if (onStockUpdate) {
                onStockUpdate();
            }
            setShowModal(false);
        } catch (error) {
            console.error("Error updating stock:", error);
            setToastMessage("Error updating stock");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            <div className="ingredient-card">
                <h3>{name}</h3>
                <p>Code: {code}</p>
                <p>Price: ₱{price.toFixed(2)}</p>
                <p>Category: {category}</p>
                <p>Stock: {stockNumber}</p>
                <button 
                    onClick={() => setShowModal(true)}
                    className="edit-button"
                >
                    Edit Stock
                </button>
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

            {showToast && (
                <div className="toast-notification">
                    {toastMessage}
                </div>
            )}
        </>
    );
}

export default IngredientCard;