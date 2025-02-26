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
        setCurrentProduct,
        currentProduct,
        currentTray
    }) {
    
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
                />
            ))}
        </div>
        </>
    );
}

export default TrayContainer