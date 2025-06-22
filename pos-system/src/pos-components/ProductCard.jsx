import { useState, useEffect } from 'react';
import styles from './ProductCard.module.css';
import defaultImage from '../assets/0.png';
/* import { firestore } from '/firebase.js';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage'; */
import { getSessionDetails } from '../handlers/SessionHandler';
import { supabase } from '../database/supabase';

function ProductCard({productClass, type, addToTray, categoryColor}) {
    const [imageUrl, setImageUrl] = useState(defaultImage);
    const [imageLoading, setImageLoading] = useState(true);

    useEffect(() => {
        const fetchImage = async () => {
            if (!productClass || !productClass.name) {
                console.error("Invalid product data:", productClass);
                setImageUrl(defaultImage);
                setImageLoading(false);
                return;
            }

            try {
                const imageName = `${productClass.code}.jpg`;
                const { data, error } = await supabase
                    .storage
                    .from(import.meta.env.VITE_SUPABASE_IMAGE_STORAGE_BUCKET)
                    .list('', {
                        limit: 100,
                        offset: 0,
                        sortBy: { column: 'name', order: 'asc' },
                    });

                console.log("Image list data:", data);
                
                if (error) {
                    console.error('Error listing files:', error);
                    setImageUrl(defaultImage);
                    return;
                }
                
                const fileExists = data.some(file => file.name === imageName);
                
                if (fileExists) {
                    const { data } = await supabase
                        .storage
                        .from(import.meta.env.VITE_SUPABASE_IMAGE_STORAGE_BUCKET)
                        .getPublicUrl(`${imageName}`);
                        
                    setImageUrl(data.publicUrl);
                    console.log("Uploading: ", data.publicUrl);
                } else {
                    setImageUrl(defaultImage);
                }
            } catch (error) {
                console.error(`Error fetching image for ${productClass.name}:`, error);
                setImageUrl(defaultImage);
            } finally {
                setImageLoading(false);
            }
        };
        console.log("[PRODUCTCARD] Fetching image for product:", productClass.name);
        fetchImage();
    }, [productClass?.name]);
  
    /* const [isUpdating, setIsUpdating] = useState(false); */

    /* const updateProductStock = async (productName) => {
        try {
            setIsUpdating(true);
            const sessionToken = getSessionDetails().token;
            
            if (!sessionToken) {
                console.error("No active session found");
                return false;
            }

            // Find the product document with matching name and session token
            const productsRef = collection(firestore, 'Products');
            const q = query(
                productsRef, 
                where('sessionToken', '==', sessionToken),
                where('name', '==', productName)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.error("Product not found in current session");
                return false;
            }

            // Get the first matching document
            const productDoc = querySnapshot.docs[0];
            const currentStock = productDoc.data().stockNumber;

            if (currentStock <= 0) {
                alert(`${productName} is out of stock!`);
                return false;
            }

            // Update the stock number
            await updateDoc(productDoc.ref, {
                stockNumber: currentStock - 1
            });

            console.log(`Updated stock for ${productName}: ${currentStock - 1}`);
            return true;

        } catch (error) {
            console.error("Error updating stock:", error);
            return false;
        } finally {
            setIsUpdating(false);
        }
    }; */

    const handleClick = async (e) => {
        e.stopPropagation();
        
        /* if (isUpdating) return; // Prevent multiple clicks while updating

        const stockUpdateSuccess = await updateProductStock(productClass.name);
        
        if (stockUpdateSuccess) {
            
        } */
        addToTray(productClass);
    };

    return (
        <div className={styles.rootContainer} onClick={handleClick}
            style={{'--category-color': categoryColor}}>
            <div className={styles.category}> </div>
            <div className={styles.detailsContainer}>
                <div className={styles.imageContainer}>
                    <img src={imageUrl} alt="Product Image" />
                </div>
                <div className={styles.productDetails}> 
                    <p> {productClass.name} </p>
                </div>
            </div>
        </div>
    );
}

export default ProductCard;