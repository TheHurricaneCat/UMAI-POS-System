import styles from './PopUp.module.css';

function PopUp({text, trigger, setTrigger, confirm, setConfirm}) {
    
    const handleConfirm = () => {
        setConfirm(true);  // Set confirm to true when Save is clicked
        setTrigger(false); // Close the popup
    };
    
    const handleCancel = () => {
        setTrigger(false); // Just close the popup without setting confirm
    };
    
    return (trigger) ? (
        <div className={styles.popup}>
            <div className={styles.popupInner}>
                <h1> {text} </h1>
                <div className={styles.buttonContainer}> 
                    <button className={styles.saveButton} onClick={handleConfirm}> Save </button>
                    <button className={styles.cancelButton} onClick={handleCancel}> Cancel </button>
                </div>
                
            </div>
        </div>
    ) : "";
}

export default PopUp