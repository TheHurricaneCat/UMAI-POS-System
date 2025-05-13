import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import styles from './NavigationContainer.module.css';
import PopUp from "../global-components/PopUp";

function NavigationContainer({handleStartSession, handleEndSession, saveExcelFile, userRole}) {
    const navigate = useNavigate();
    const [endSessionPopup, setEndSessionPopup] = useState(false);
    const [confirmEndSession, setConfirmEndSession] = useState(false);

    const handleEndSessionClick = () => {
        setEndSessionPopup(true);
    };

    useEffect(() => {
        if (confirmEndSession) {
            handleEndSession();
            setConfirmEndSession(false);
        }
    }, [confirmEndSession, handleEndSession]);

    return (
        <div className={styles.headerButtons}>
            <PopUp 
                text={"Are you sure you want to end the current session?"} 
                button1={"Confirm"}
                button2={"Cancel"}
                trigger={endSessionPopup} 
                setTrigger={setEndSessionPopup} 
                confirm={confirmEndSession}
                setConfirm={setConfirmEndSession}
            />
            
            <button className="header-button session-start" onClick={handleStartSession}>
                Start Session
            </button>
            <button className="header-button session-end" onClick={handleEndSessionClick}>
                End Session
            </button>
            <button className="header-button excel" onClick={saveExcelFile}>
                Save Excel
            </button>
            {(userRole === "admin") ? (
                <>
                {/* <button className="header-button inventory" onClick={() => navigate('/inventory')}>
                    Inventory
                </button>
                <button className="header-button statistics" onClick={() => navigate('/statistics')}>
                    Statistics
                </button> */}
                <button className="header-button account" onClick={() => navigate('/session-viewer')}>
                    Session Viewer
                </button>
                <button className="header-button account" onClick={() => navigate('/product-manager')}>
                    Product Manager
                </button>
                </>
            ) : null }
        </div>
    );
}

export default NavigationContainer;