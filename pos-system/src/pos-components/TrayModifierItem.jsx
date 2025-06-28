import styles from './TrayModifierItem.module.css';

function TrayModifierItem({ modifierContent, handleModifierIncrement, handleModifierDecrement, handleModifierDeletion, isPromo }) {
    const { name, price, quantity, code } = modifierContent;

    return (
        <div className={styles.modifierDetails}>
            <div> </div>
            <div className={styles.modifierName}>
                <p>{name} ({code})</p>
            </div>
            <div className={styles.modifierQuantity}>
                <p>{quantity}</p>
            </div>
            <div className={styles.modifierPrice}>
                <p>P{price.toFixed(2)}</p>
                
            </div>
            { (isPromo === false) ? (
                <div className={styles.removeButton}>
                    <button onClick={() => handleModifierDeletion(name)}> x </button>
                </div>
            ) : null }
            
        </div>
    );
}

export default TrayModifierItem;
