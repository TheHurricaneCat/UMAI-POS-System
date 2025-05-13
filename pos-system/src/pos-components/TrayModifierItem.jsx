import styles from './TrayModifierItem.module.css';

function TrayModifierItem({ modifierContent, handleModifierIncrement, handleModifierDecrement, handleModifierDeletion, isPromo }) {
    const { name, price, quantity } = modifierContent;

    return (
        <div className={styles.modifierDetails}>
            <div className={styles.modifierQuantity}>
                <p>{quantity}</p>
            </div>
            <div className={styles.modifierName}>
                <p>{name}</p>
            </div>
            <div className={styles.modifierPrice}>
                <p>{price}</p>
            </div>
            <div> </div>
            <div> </div>
            { (isPromo === false) ? (
                <div className={styles.removeButton}>
                    <button onClick={() => handleModifierDeletion(name)}> x </button>
                </div>
            ) : null }
            
        </div>
    );
}

export default TrayModifierItem;
