import styles from './ProductCard.module.css';
import defaultImage from '../assets/0.png'

function ProductCard({productClass, type, addToTray}) {
    
    return (
        <div className={styles.rootContainer} onClick={(e) =>  {
            e.stopPropagation();
            addToTray(productClass)
        }
        }>
        
            <div className={styles.category}> </div>
            <div className={styles.detailsContainer}>
                <div className={styles.imageContainer}> <img src={defaultImage} alt="Product Image" /> </div>
                <p> {productClass.name} </p>
            </div>
        </div>
    )
}

export default ProductCard