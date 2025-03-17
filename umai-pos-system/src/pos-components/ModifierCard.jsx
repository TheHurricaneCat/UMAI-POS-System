import { useState } from 'react';
import styles from './ModifierCard.module.css';
import { firestore } from '/firebase.js';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getSessionDetails } from '../handlers/SessionHandler';

function ModifierCard({modifierClass, addModifier, currentProduct}) { // Add currentProduct prop
    const [isUpdating, setIsUpdating] = useState(false);

    const updateModifierStock = async (modifierName) => {
        try {
            setIsUpdating(true);
            
            // First check if a product is selected
            if (!currentProduct) {
                alert('Please select a product first');
                return false;
            }

            const sessionToken = getSessionDetails().token;
            
            if (!sessionToken) {
                console.error("No active session found");
                return false;
            }

            // Rest of your existing code for updating stock...
            const modifiersRef = collection(firestore, 'Modifiers');
            const q = query(
                modifiersRef, 
                where('sessionToken', '==', sessionToken),
                where('name', '==', modifierName)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.error("Modifier not found in current session");
                return false;
            }

            const modifierDoc = querySnapshot.docs[0];
            const currentStock = modifierDoc.data().stockNumber;

            if (currentStock <= 0) {
                alert(`${modifierName} is out of stock!`);
                return false;
            }

            await updateDoc(modifierDoc.ref, {
                stockNumber: currentStock - 1
            });

            console.log(`Updated stock for ${modifierName}: ${currentStock - 1}`);
            return true;

        } catch (error) {
            console.error("Error updating modifier stock:", error);
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClick = async (e) => {
        e.stopPropagation();
        
        if (isUpdating) return;

        // Check for product selection before even attempting to update stock
        if (!currentProduct) {
            alert('Please select a product first');
            return;
        }

        const stockUpdateSuccess = await updateModifierStock(modifierClass.name);
        
        if (stockUpdateSuccess) {
            addModifier(modifierClass);
        }
    };
    
    return (
        <div className={styles.rootContainer} onClick={handleClick}>  
            <div className={styles.detailsContainer}>
                <p> {modifierClass.name} </p>
            </div>
            <div className={styles.decorationHeader}> 
                <p> + </p>
            </div>
        </div>
    );
}

export default ModifierCard;