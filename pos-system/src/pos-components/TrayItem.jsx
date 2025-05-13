import React, { useEffect } from 'react';
import styles from './TrayItem.module.css';
import defaultImage from '../assets/0.png'
import TrayModifierItem from './TrayModifierItem.jsx';

function TrayItem({ 
    productContent, 
    handleProductIncrement, 
    handleProductDecrement, 
    handleProductDeletion, 
    handleModifierIncrement, 
    handleModifierDecrement, 
    handleModifierDeletion, 
    setCurrentProduct,
    currentProduct,
    parentTray,
    currentTray,
    }) {
    const { name, price, quantity} = productContent;

    const isSelected = currentProduct === name && currentTray === parentTray;

    useEffect(() => {
        console.log("currentProduct:", currentProduct);
        console.log("name:", name);
        console.log("isSelected:", isSelected);
    }, [currentProduct, name]);

    return (
        <div className={`${styles.rootContainer} ${isSelected ? styles.selected : ''}`} onClick={(e) =>  {
            e.stopPropagation();
            setCurrentProduct(name)
        }
        }>
            <div className={styles.productDetails}> 
                <div className={styles.productQuantity}>
                    <h4>{quantity}</h4>
                </div>
                <div className={styles.productImage}>
                    <img src={defaultImage} alt="Product Image" />
                </div>
                <div className={styles.productName}>
                    <h4>{name}</h4>
                </div>
                <div className={styles.productPrice}>
                    <h4>P{price.toFixed(2)}</h4>
                </div>
                <div className={styles.addButton}>
                    <button onClick={() => handleProductIncrement(name)}> + </button>
                </div>
                <div className={styles.subtractButton}>
                    <button onClick={() => handleProductDecrement(name)}> - </button>
                </div>
                <div className={styles.removeButton}>
                    <button onClick={() => handleProductDeletion(name)}> x </button>
                </div>
            </div>
            <div> 
                <div className={`${styles.modifierContainer} ${isSelected ? styles.selected : ''}`}> 
                    {productContent.modifiers.map((item, index) => (
                    <TrayModifierItem 
                        key={index} 
                        modifierContent={item} 

                        handleModifierIncrement={handleModifierIncrement}
                        handleModifierDecrement={handleModifierDecrement}
                        handleModifierDeletion={handleModifierDeletion}
                        isPromo={false}
                    />
                    ))}
                </div>
                {/* This is for promo products */}
                <div className={`${styles.modifierContainer} ${isSelected ? styles.selected : ''}`}> 
                    {productContent.content.map((item, index) => (
                    <TrayModifierItem 
                        key={index} 
                        modifierContent={item} 

                        handleModifierIncrement={handleModifierIncrement}
                        handleModifierDecrement={handleModifierDecrement}
                        handleModifierDeletion={handleModifierDeletion}
                        isPromo={true}
                    />
                    ))}
                </div>
            </div>
            
        </div>
    );
}

export default TrayItem;
