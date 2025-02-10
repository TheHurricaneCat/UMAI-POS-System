import React, { useState } from 'react';
import styles from './TrayContainer.module.css';
import TrayItem from './TrayItem.jsx';

/* const [currentProduct, setCurrentProduct] = useState(0); */

function TrayContainer({   
        content, 
        handleProductIncrement, 
        handleProductDecrement, 
        handleProductDeletion, 
        handleModifierIncrement, 
        handleModifierDecrement, 
        handleModifierDeletion, 
        setCurrentTray, 
        setCurrentProduct
    }) {
    
    const selectProduct = (product) => {
        setCurrentProduct(product);
    }
    
    return (
        <>
        <div className={styles.trayHeader}> 
            <h2> Tray {content.id} </h2>
            <button onClick={() => setCurrentTray(content.id)}> {/* {isSelected ? "Selected" : "Select"} */} Select </button> 
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
                />
            ))}
        </div>
        </>
    );
}

export default TrayContainer