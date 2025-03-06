import React, { useState } from 'react';
import styles from './TrayContainer.module.css';
import TrayItem from './TrayItem.jsx';

function TrayContainer({   
        content, 
        handleProductIncrement, 
        handleProductDecrement, 
        handleProductDeletion, 
        handleModifierIncrement, 
        handleModifierDecrement, 
        handleModifierDeletion, 
        setCurrentTray, 
        setCurrentProduct,
        currentProduct,
        currentTray,
        saveCustomerToTray  // Make sure this prop is added here
    }) {
    
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    
    const selectProduct = (product) => {
        setCurrentProduct(product);
    }

    const isSelected = currentTray === content.id;
    
    return (
        <>
        <div className={`${styles.trayHeader} ${isSelected ? styles.selected : ''}`} 
            onClick={() => setCurrentTray(content.id)}> 
            
            <h2> Tray {content.id} </h2>
            <div className={styles.indicator}> </div>
            
            {/* Customer info button and info display */}
            <div className={styles.customerSection}>
                {content.customer ? (
                    <div className={styles.customerInfo}>
                        <span>{content.customer.customerName}</span>
                        <button 
                            className={styles.addCustomerBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCustomerModal(true);
                            }}
                        >
                            Add Customer
                        </button>
                    </div>
                ) : (
                    <button 
                        className={styles.addCustomerBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowCustomerModal(true);
                        }}
                    >
                        Add Customer
                    </button>
                )}
            </div>
        </div>
        
        <div className={styles.trayContainer}> 
            {content.products.map((item, index) => (
                <TrayItem 
                key={index} 
                productContent={item} 

                handleProductIncrement={handleProductIncrement} 
                handleProductDecrement={handleProductDecrement} 
                handleProductDeletion={handleProductDeletion} 

                handleModifierIncrement={handleModifierIncrement} 
                handleModifierDecrement={handleModifierDecrement} 
                handleModifierDeletion={handleModifierDeletion}
                
                selectProduct={selectProduct} 
                setCurrentProduct={setCurrentProduct}
                currentProduct={currentProduct}
                currentTray={currentTray}
                parentTray={content.id}
                />
            ))}
        </div>
        
        {/* Customer information modal */}
        {showCustomerModal && (
            <CustomerModal 
                initialCustomer={content.customer}
                trayId={content.id}
                onSave={(customer) => {
                    // Now using the prop passed from parent
                    saveCustomerToTray(content.id, customer);
                    setShowCustomerModal(false);
                }}
                onClose={() => setShowCustomerModal(false)}
            />
        )}
        </>
    );
}

// Customer modal component
function CustomerModal({ initialCustomer, trayId, onSave, onClose }) {
    const [customer, setCustomer] = useState(initialCustomer || {
        customerName: '',
        address: '',
        contactNumber: '',
        paymentMethod: 'Cash' // Default payment method
    });
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCustomer(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!customer.customerName || !customer.address || !customer.contactNumber) {
            alert('Please fill in all required fields');
            return;
        }
        onSave(customer);
    };
    
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3>Customer Information for Tray {trayId}</h3>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="customerName">Customer Name*</label>
                        <input 
                            type="text" 
                            id="customerName" 
                            name="customerName" 
                            value={customer.customerName} 
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label htmlFor="address">Address*</label>
                        <input 
                            type="text" 
                            id="address" 
                            name="address" 
                            value={customer.address} 
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label htmlFor="contactNumber">Contact Number*</label>
                        <input 
                            type="text" 
                            id="contactNumber" 
                            name="contactNumber" 
                            value={customer.contactNumber} 
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label htmlFor="paymentMethod">Payment Method</label>
                        <select 
                            id="paymentMethod" 
                            name="paymentMethod" 
                            value={customer.paymentMethod} 
                            onChange={handleChange}
                        >
                            <option value="Cash">Cash</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Debit Card">Debit Card</option>
                            <option value="Mobile Payment">Mobile Payment</option>
                        </select>
                    </div>
                    
                    <div className={styles.buttonGroup}>
                        <button type="submit" className={styles.saveButton}>Save</button>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TrayContainer;