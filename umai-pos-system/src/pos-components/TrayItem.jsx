import styles from './TrayItem.module.css';
import defaultImage from '/src/assets/0.png'
import TrayModifierItem from './TrayModifierItem.jsx';

function TrayItem({ 
    productContent, 
    handleProductIncrement, 
    handleProductDecrement, 
    handleProductDeletion, 
    handleModifierIncrement, 
    handleModifierDecrement, 
    handleModifierDeletion, 
    setCurrentProduct 
    }) {
    const { name, price, quantity } = productContent;

    return (
        <div className={styles.rootContainer} onClick={(e) =>  {
            e.stopPropagation();
            setCurrentProduct(productContent.name)}
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
                    <h4>{price}</h4>
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
            <div className={styles.modifierContainer}> 
                {productContent.modifiers.map((item, index) => (
                <TrayModifierItem 
                    key={index} 
                    modifierContent={item} 

                    handleModifierIncrement={handleModifierIncrement}
                    handleModifierDecrement={handleModifierDecrement}
                    handleModifierDeletion={handleModifierDeletion}
                />
                ))}
            </div>
        </div>
    );
}

export default TrayItem;
