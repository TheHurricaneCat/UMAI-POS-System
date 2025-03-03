import styles from './PopUp.module.css';

function PopUp({trigger, setTrigger}) {
    
    return (trigger) ? (
        <div className={styles.popup}>
            <div className={styles.popupInner}>
                <h1>test test</h1>
                <button onClick={() => setTrigger(false)}> Close </button>
            </div>
        </div>
    ) : "";
}

export default PopUp