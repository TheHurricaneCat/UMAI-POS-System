import { useNavigate } from "react-router-dom";
import { useState, useEffect, use } from "react";
import styles from './NavigationContainer.module.css';
import PopUp from "../global-components/PopUp";
import { logOut } from "../handlers/SessionHandler";

function NavigationContainer({handleStartSession, handleEndSession, saveExcelFile, userRole, handleClockOut, handleLogOut}) {
    const navigate = useNavigate();
    const [endSessionPopup, setEndSessionPopup] = useState(false);
    const [confirmEndSession, setConfirmEndSession] = useState(false);
    
    const [logOutPopup, setLogOutPopup] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    
    const [clockOutPopup, setClockOutPopup] = useState(false);
    const [confirmClockout, setConfirmClockout] = useState(false);

    const handleLogoutClick = () => {
        setLogOutPopup(true);
    }
    
    const handleClockoutClick = () => {
        setClockOutPopup(true);
    };

    const handleEndSessionClick = () => {
        setEndSessionPopup(true);
    };

    useEffect(() => {
        if (confirmLogout) {
            handleLogOut();
            setConfirmLogout(false);
        }
    }, [confirmLogout, handleLogOut]);

    useEffect(() => {
        if (confirmClockout) {
            handleClockOut();
            setConfirmClockout(false);
        }
    }, [confirmClockout, handleClockOut]);

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

            <PopUp 
                text={"Are you sure you want to clock out?"} 
                button1={"Confirm"}
                button2={"Cancel"}
                trigger={clockOutPopup}
                setTrigger={setClockOutPopup}
                confirm={confirmClockout}
                setConfirm={setConfirmClockout}
            />

            <PopUp 
                text={"Are you sure you want to log out?"} 
                button1={"Confirm"}
                button2={"Cancel"}
                trigger={logOutPopup}
                setTrigger={setLogOutPopup}
                confirm={confirmLogout}
                setConfirm={setConfirmLogout}
            />
            
            <button className="header-button session-start" onClick={handleStartSession}>
                Restore Session
            </button>
            <button className="header-button clock-out" onClick={handleClockoutClick}>
                Clock out
            </button>
            <button className="header-button sign-out" onClick={handleLogoutClick}>
                Log out
            </button>
            <button className="header-button session-end" onClick={handleEndSessionClick}>
                End Session
            </button>
            <button className="header-button excel" onClick={saveExcelFile}>
                Save Excel
            </button>
            <button className="header-button transaction-viewer" onClick={() => navigate('/transaction-viewer')}>
                Transaction Viewer
            </button>
            {(userRole === "admin") ? (
                <>
                {<button className="header-button inventory" onClick={() => navigate('/inventory')}>
                    Inventory
                </button>}
                 <button className="header-button statistics" onClick={() => navigate('/statistics')}>
                    Statistics
                </button>
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