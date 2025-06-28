import React, { useEffect, useState } from 'react';
import styles from './TrayItem.module.css';
import defaultImage from '../assets/0.png'
import TrayModifierItem from './TrayModifierItem.jsx';
import { supabase } from '../database/supabase';

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
    const { name, price, quantity, code} = productContent;
    const [imageUrl, setImageUrl] = useState(defaultImage);
    const isSelected = currentProduct === name && currentTray === parentTray;

    useEffect(() => {
        const fetchProductImage = async () => {
            try {
                if (code) {
                    const { data, error } = await supabase.storage
                        .from(import.meta.env.VITE_SUPABASE_IMAGE_STORAGE_BUCKET)
                        .getPublicUrl(`${code}.jpg`);
                    
                    if (!error && data) {
                        // Check if image exists by preloading it
                        const img = new Image();
                        img.onload = () => {
                            setImageUrl(data.publicUrl);
                        };
                        img.onerror = () => {
                            setImageUrl(defaultImage); // Keep default if image doesn't load
                        };
                        img.src = data.publicUrl;
                    }
                }
            } catch (error) {
                console.error("Error fetching product image:", error);
                setImageUrl(defaultImage);
            }
        };

        fetchProductImage();
    }, [code]);
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
                
                <div className={styles.productImage}>
                    <img src={imageUrl} alt="Product Image" />
                </div>
                <div className={styles.productName}>
                    <h5>{name}</h5>
                    <p>P{code}</p>
                    {/* <p>P{price.toFixed(2)}</p> */}
                </div>
                <div className={styles.qtyButton}>
                    <button className={styles.subtractButton} onClick={() => handleProductDecrement(name)}> - </button>
                    <h5>{quantity}</h5>
                    <button className={styles.addButton} onClick={() => handleProductIncrement(name)}> + </button>
                </div>
                <div className={styles.productPrice}>
                    <h5>P{price.toFixed(2)}</h5>
                    <p> total: P{(quantity * price).toFixed(2)}</p>
                </div>
                <div className={styles.removeButton}>
                    <button onClick={() => handleProductDeletion(name)}> X </button>
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
