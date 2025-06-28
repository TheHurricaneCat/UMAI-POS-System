import { useState, useRef, useEffect } from 'react';
import { appendEntry } from '../handlers/DataHandler';
import styles from './KeypadContainer.module.css';
import PopUp from '../global-components/PopUp.jsx';
import { fetchProductCatalog } from '../handlers/SessionHandler.js';
import { getLastTransaction } from '../handlers/DataHandler';

import ReceiptModal from './ReceiptModal';

function KeypadContainer({ addNewTray, currentTotal, tray, clearTray, clearCurrentTray, currentTray }) {
    const [buttonPopUp, setButtonPopUp] = useState(false);
    const [emptyTrayPopup, setEmptyTrayPopup] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [receiptPopup, setReceiptPopup] = useState(false);
    const [savedTray, setSavedTray] = useState([]);
    const [total, setTotal] = useState(0);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [discountSelected, setDiscountSelected] = useState(false); // New state to track discount selection

    const [showReceiptModal, setShowReceiptModal] = useState(false);

    const [modifiers, setModifiers] = useState([]);
    const [discount, setDiscount] = useState({
        name: 'None',
        value: 0,
        type: 'None'
    });

    useEffect(() => {
        async function loadModifiers() {
            try {
                const catalog = await fetchProductCatalog("modifier");
                if (catalog && Array.isArray(catalog) && catalog[1]) {
                    setModifiers(catalog[1]);
                    console.log("Loaded modifiers:", catalog[1]);
                } else {
                    console.error("Failed to load modifiers");
                }
            } catch (error) {
                console.error("Error loading modifiers:", error);
            }
        }
        
        loadModifiers();
    }, []);

    ////////////////////////
    // Listener that handles confirmation and saving of orders
    // Press save order -> show popup confirmation -> show discount modal -> [process confirmation]
    ////////////////////////

    useEffect(() => {
        const handleConfirmation = async () => {
            if (confirm && discountSelected) {
                const traysWithoutCustomers = tray.filter(t => !t.customer || !t.customer.customerName);
                
                if (traysWithoutCustomers.length > 0) {
                    const trayNumbers = traysWithoutCustomers.map(t => `Tray ${t.id}`).join(', ');
                    alert(`Please add customer details for ${trayNumbers} before saving the order.`);
                    setConfirm(false);
                    setDiscountSelected(false);
                    return;
                }

                await appendEntry(tray, discount, total);
                
                //QoL change - Immediately print the receipt after saving
                handlePrintReceipt();
                
                // Save the current tray before clearing
                const currentTrayData = tray.find(t => t.id === currentTray);
                setSavedTray(currentTrayData);
                
                setConfirm(false);
                setDiscountSelected(false);
                clearCurrentTray(); // Clear the tray after saving
            }
        };
        
        handleConfirmation();
    }, [confirm, discountSelected, tray, discount, total, currentTray]);

    // New useEffect to handle showing discount modal after initial confirmation
    useEffect(() => {
        if (confirm && !discountSelected) {
            setButtonPopUp(false); // Hide the initial confirmation popup
            setShowDiscountModal(true); // Show discount modal
        }
    }, [confirm, discountSelected]);

    useEffect(() => {
        const calculateTotal = () => {
            let newTotal = 0;
            const currentTrayObj = tray.find(t => t.id === currentTray);
            if (currentTrayObj) {
                currentTrayObj.products.forEach(product => {
                    // Calculate product total
                    const productTotal = product.price * product.quantity;
                    
                    // Calculate discount amount based on percentage
                    const discountAmount = productTotal * (discount.value || 0);
                    
                    // Add to total after applying discount
                    newTotal += productTotal - discountAmount;
                });
            }
            setTotal(newTotal);
        };
    
        calculateTotal();
    }, [tray, currentTray, discount]);

    const handleSaveOrder = () => {
        const currentTrayObj = tray.find(t => t.id === currentTray);
        const hasItems = currentTrayObj && currentTrayObj.products && currentTrayObj.products.length > 0;
        
        if (!hasItems) {
            setEmptyTrayPopup(true);
            handlePrintReceipt
            return;
        } else {
            setButtonPopUp(true);
        }
    };

    const handlePrintReceipt = async () => {
        try {
            // Get the last transaction from the Excel file
            const lastTransaction = await getLastTransaction();
            
            if (!lastTransaction) {
                console.error("No transaction found to print");
                setEmptyTrayPopup(true);
                return;
            }
            
            console.log("Retrieved last transaction for receipt:", lastTransaction);
            
            // Set the retrieved transaction as the data for the receipt
            setSavedTray(lastTransaction);
            
            // Show the receipt modal
            setShowReceiptModal(true);
        } catch (error) {
            console.error("Error printing receipt:", error);
            setEmptyTrayPopup(true);
        }
    };

    const handleApplyDiscount = (discountObj) => {
        // Logic to apply discount to the current tray
        setDiscount(discountObj);
        setShowDiscountModal(false);
        setDiscountSelected(true); // Mark that discount has been selected
    };

    return (
        <>
            <PopUp 
                text={"Save current order?"} 
                button1={"Save"}
                button2={"Cancel"}
                trigger={buttonPopUp} 
                setTrigger={setButtonPopUp} 
                confirm={confirm}
                setConfirm={setConfirm}
            />
            <PopUp 
                text={"No items in tray. Add items to save order."} 
                button1={"Ok"}
                button2={"Cancel"}
                trigger={emptyTrayPopup} 
                setTrigger={setEmptyTrayPopup} 
                confirm={false}
                setConfirm={() => {}}
            />
            {savedTray && (
                <ReceiptModal
                    isOpen={showReceiptModal}
                    onClose={() => setShowReceiptModal(false)}
                    orderData={savedTray}
                    discount={discount}
                />
            )}
            <div className={styles.primaryContainer}>
               {/*  <div className={styles.traySummary}> <h3> Tray {currentTray} Summary </h3> </div> */}
                {/* <div className={styles.discountButton}>
                    <button onClick={() => setShowDiscountModal(true)}>Apply Discount</button>
                </div> */}
                <div className={styles.totalMoney}> <h3> Tray Total: P{total.toFixed(2)} </h3> </div>
                
                {/* <div className={styles.printReceipt}> <button onClick={handlePrintReceipt}> Print Receipt </button> </div> */}
                <div className={styles.saveOrder}> <button onClick={handleSaveOrder}> Save Order </button> </div>
                <div className={styles.clearOrder}> <button onClick={clearCurrentTray}> Clear Order </button> </div>
                <div className={styles.addTray}> <button onClick={addNewTray}> Add Tray</button> </div>
                <div className={styles.clearTray}> <button onClick={clearTray}> Clear Tray </button> </div>
            </div>
            {showDiscountModal && (
                <DiscountModal
                onApply={handleApplyDiscount}
                onClose={() => {
                    setShowDiscountModal(false);
                    setConfirm(false); // Cancel the entire process if discount modal is closed
                    setDiscountSelected(false);
                }}
                modifiers={modifiers}
                currentDiscount={discount}
                />
            )}
        </>
    );
}

// Discount modal component
function DiscountModal({ onApply, onClose, modifiers, currentDiscount }) {
    const [discount, setDiscount] = useState({
        name: (currentDiscount && currentDiscount.name) || 'None',
        value: (currentDiscount && currentDiscount.value) || 0,
        type: (currentDiscount && currentDiscount.type) || 'None'
    });

    // Filter discount modifiers
    const discountModifiers = modifiers.filter(m => m.category === "Discount");
    
    // Check if modifiers are loaded
    useEffect(() => {
        if (!modifiers || modifiers.length === 0) {
            console.error("No modifiers available");
        } else {
            console.log("Available modifiers:", modifiers);
            console.log("Discount modifiers:", discountModifiers);
        }
    }, [modifiers, discountModifiers]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === "type") {
            if (value === "None") {
                setDiscount({
                    name: 'None',
                    value: 0,
                    type: 'None'
                });
            } else {
                // Find the modifier by ID or unique identifier instead of index
                const selectedModifier = modifiers.find(m => m.id === value || m.name === value);
                // Or if you're using index, find it in the discountModifiers array
                // const selectedModifier = discountModifiers[parseInt(value)];
                
                if (selectedModifier) {
                    setDiscount({
                        name: selectedModifier.name,
                        value: Math.abs(selectedModifier.price), // Assuming price is stored as decimal (0.10 = 10%)
                        type: selectedModifier.name
                    });
                }
            }
        } else {
            setDiscount(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };
   
    const handleSubmit = (e) => {
        e.preventDefault();
        onApply(discount);
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3> Apply Discount </h3>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="type">Discount Type</label>
                        {discountModifiers.length === 0 ? (
                            <p className={styles.noDiscounts}>No discount options available</p>
                        ) : (
                            <select
                                id="type"
                                name="type"
                                value={discount.type}
                                onChange={handleChange}
                            >
                                <option value="None">None</option>
                                {discountModifiers.map((modifier, index) => (
                                    <option key={modifier.id || index} value={modifier.id || modifier.name}>
                                        {modifier.name} ({Math.abs(modifier.price * 100).toFixed(0)}%)
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className={styles.buttonGroup}>
                        <button type="submit" className={styles.applyButton}>
                            {discount.value > 0 ? 'Apply Discount' : 'Remove Discount'}
                        </button>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default KeypadContainer;