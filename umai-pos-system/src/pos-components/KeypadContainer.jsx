import { useState, useRef, useEffect } from 'react'
import { appendEntry } from '../handlers/DataHandler';
import styles from './KeypadContainer.module.css';
import PopUp from '../global-components/PopUp.jsx';

function KeypadContainer({addNewTray, currentTotal, appendEntry, tray, clearTray, clearCurrentTray, currentTray}) {
    const [buttonPopUp, setButtonPopUp] = useState(false);
    const [confirm, setConfirm] = useState(false);
    
    useEffect(() => {
        const handleConfirmation = async () => {
            if (confirm) {
                // User clicked "Save" in the popup
                const traysWithoutCustomers = tray.filter(t => !t.customer || !t.customer.customerName);
                
                if (traysWithoutCustomers.length > 0) {
                    // Create an alert message listing all trays without customer details
                    const trayNumbers = traysWithoutCustomers.map(t => `Tray ${t.id}`).join(', ');
                    alert(`Please add customer details for ${trayNumbers} before saving the order.`);
                    return;
                }
                
                // If all trays have customer details, proceed with saving the order
                await appendEntry(tray);
                
                // Reset confirm state
                setConfirm(false);
            }
        };
        
        handleConfirmation();
    }, [confirm, tray, appendEntry]);

    const handleSaveOrder = () => {
        // Show the popup and wait for user confirmation
        setButtonPopUp(true);
    };
    
    return (
        <>
            <PopUp 
                text={"Save current order?"} 
                button1={"Save"}
                button2={"Cancel"}
                trigger={buttonPopUp} 
                setTrigger={setButtonPopUp} 
                confirm={confirm}
                setConfirm={setConfirm}
            />
            <div className={styles.primaryContainer}>
                <div className={styles.traySummary}> <h3> Tray {currentTray} Summary </h3> </div>
                <div className={styles.totalMoney}> <h3> Total: P{currentTotal.toFixed(2)} </h3> </div>
                <div className={styles.addTray}> <button onClick={addNewTray}> Add Tray</button> </div>

                <div className={styles.saveOrder}> <button onClick={handleSaveOrder}> Save Order </button> </div>
                <div className={styles.clearOrder}> <button onClick={clearCurrentTray}> Clear Order </button> </div>
                <div className={styles.clearTray}> <button onClick={clearTray}> Clear Tray </button> </div>
            </div>
            
        </>
    );
}

export default KeypadContainer;