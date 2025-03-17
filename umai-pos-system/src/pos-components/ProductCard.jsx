import { useEffect, useState } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import styles from './ProductCard.module.css';
import defaultImage from '../assets/0.png';

function ProductCard({ productClass, type, addToTray }) {
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

    return (
        <div className={styles.rootContainer} onClick={(e) => {
            e.stopPropagation();
            addToTray(productClass);
        }}>
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