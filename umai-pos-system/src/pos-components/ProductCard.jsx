import { useState, useEffect } from 'react';
import styles from './ProductCard.module.css';
import defaultImage from '../assets/0.png';
import { firestore } from '/firebase.js';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getSessionDetails } from '../handlers/SessionHandler';

function ProductCard({productClass, type, addToTray}) {
    const [imageUrl, setImageUrl] = useState(defaultImage);

    useEffect(() => {
        const fetchImage = async () => {
            const storage = getStorage();
            const imageRef = ref(storage, `${productClass.name}.png`);
            try {
                const url = await getDownloadURL(imageRef);
                setImageUrl(url);
            } catch (error) {
                console.error("Error fetching image:", error);
                setImageUrl(defaultImage);
            }
        };

        fetchImage();
    }, [productClass.code]);
  
    const [isUpdating, setIsUpdating] = useState(false);

    const updateProductStock = async (productName) => {
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
    };

    const handleClick = async (e) => {
        e.stopPropagation();
        
        if (isUpdating) return; // Prevent multiple clicks while updating

        const stockUpdateSuccess = await updateProductStock(productClass.name);
        
        if (stockUpdateSuccess) {
            addToTray(productClass);
        }
    };

    return (
        <div className={styles.rootContainer} onClick={handleClick}>
            <div className={styles.category}> </div>
            <div className={styles.detailsContainer}>
                <div className={styles.imageContainer}>
                    <img src={imageUrl} alt="Product Image" />
                </div>
                <p> {productClass.name} </p>
            </div>
        </div>
    );
}

export default ProductCard;