import { appendEntry } from '../handlers/DataHandler';
import styles from './KeypadContainer.module.css';


function KeyPadContainer({addNewTray, currentTotal, appendEntry, tray, clearTray, clearCurrentTray}) {
    const handleSaveOrder = async () => {
        await appendEntry(tray);
        clearCurrentTray();
    }
    return (
        <>
            <div className={styles.primaryContainer}>
                <div className={styles.traySummary}> <h3> Tray 1 Summary </h3> </div>
                <div className={styles.totalMoney}> <h3> Total: P{currentTotal} </h3> </div>
                <div className={styles.addTray}> <button onClick={addNewTray}> Add Tray</button> </div>

                <div className={styles.saveOrder}> <button onClick={handleSaveOrder}> Save Order </button> </div>
                <div className={styles.clearOrder}> <button> Clear Order </button> </div>
                <div className={styles.clearTray}> <button onClick={clearTray}> Clear Tray </button> </div>
            </div>
        </>
    );
}

export default KeyPadContainer
