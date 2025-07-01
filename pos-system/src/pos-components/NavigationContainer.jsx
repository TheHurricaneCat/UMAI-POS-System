import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import styles from './NavigationContainer.module.css';
import PopUp from "../global-components/PopUp";
import DropdownMenu from "./DropdownMenu";

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

    // Define session management buttons with colors
    const sessionManagementButtons = [
        { label: "Clock out", className: "header-button clock-out", onClick: handleClockoutClick, color: "red" },
        { label: "Log out", className: "header-button sign-out", onClick: handleLogoutClick, color: "orange" },
        { label: "End Session", className: "header-button session-end", onClick: handleEndSessionClick, color: "red" }
    ];

    // Define admin buttons with colors
    const adminButtons = userRole === "admin" ? [
        { label: "Session Viewer", className: "header-button account", onClick: () => navigate('/session-viewer'), color: "green" },
        { label: "Product Manager", className: "header-button account", onClick: () => navigate('/product-manager'), color: "blue" },
        { label: "Database Backup", className: "header-button account", onClick: () => navigate('/backup-manager'), color: "purple" },
        { label: "Statistics", className: "header-button account", onClick: () => navigate('/statistics'), color: "yellow" }
    ] : [];

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

            <DropdownMenu 
                title="Session Management" 
                buttons={sessionManagementButtons} 
                className="header-button session-dropdown"
                buttonColor="red"  // Default color for session buttons
            />

            <button className="header-button excel" onClick={saveExcelFile}>
                Save Excel
            </button>
            
            <button className="header-button transaction-viewer" onClick={() => navigate('/transaction-viewer')}>
                Transaction Viewer
            </button>

            <button className="header-button inventory" onClick={() => navigate('/inventory')}>
                Inventory
            </button>
            
            {(userRole === "admin") && (
                <DropdownMenu 
                    title="Admin Tools" 
                    buttons={adminButtons}
                    className="header-button admin-dropdown"
                    buttonColor="blue"  // Default color for admin buttons
                />
            )}
        </div>
    );
}

export default NavigationContainer;