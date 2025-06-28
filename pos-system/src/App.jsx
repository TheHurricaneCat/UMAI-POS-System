import { useState, useRef, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import './App.css'

import {initProductList, appendEntry} from './handlers/DataHandler'
import {products, modifiers} from './handlers/product.js'
import useTrayManager from './handlers/UseTrayManagers.js'

import ProductCard from './pos-components/ProductCard.jsx'
import CategoryContainer from './pos-components/CategoryContainer'
import TrayContainer from './pos-components/TrayContainer.jsx'
import KeypadContainer from './pos-components/KeypadContainer.jsx'
import CategoryMenu from './pos-components/CategoryMenu.jsx'
import PopUp from './global-components/PopUp.jsx';
import NavigationContainer from './pos-components/NavigationContainer.jsx';
import ContentHeader from './pos-components/ContentHeader.jsx';
import Statistics from './statistics-component/Statistics.jsx';
/* import Inventory from './inventory-components/Inventory.jsx' */
import { UserContext } from './UserContext.jsx';

import {startSession, getSessionDetails, getUsername, endSession, logOut, clockOut, saveExcelFile, fetchProductCatalog } from './handlers/SessionHandler';
 
import { isCordova } from './handlers/platform.js';

function App() {
  // IMPORTANT NOTE:
  // The following code is meant for the POS system
  // Create new interfaces (i.e. new .jsx components) that will house the other interfaces 
  const {
    tray,
    currentTray,
    addNewTray,
    addToTray,
    clearTray,
    clearCurrentTray,
    handleProductIncrement,
    handleProductDecrement,
    handleProductDeletion,
    addModifier,
    handleModifierIncrement,
    handleModifierDecrement,
    handleModifierDeletion,
    setCurrentTray,
    currentProduct,
    currentTotal,
    setCurrentProduct,
    handleScrollToCategory,
    categoryRefs,
    saveCustomerToTray,  
  } = useTrayManager();

  const [startSessionPopup, setStartSessionPopup] = useState(false);
  
  const [endSessionPopup, setEndSessionPopup] = useState(false);
  const [endSessionFailedPopup, setEndSessionFailedPopup] = useState(false);
  const [endSessionFailedClockOutPopup, setEndSessionFailedClockOutPopup] = useState(false);

  const [saveExcelPopup, setSaveExcelPopup] = useState(false);
  const [saveExcelFailedPopup, setSaveExcelFailedPopup] = useState(false);

  const [noExcelStoragePopup, setNoExcelStoragePopup] = useState(false);
  const [noExcelStorageConfirm, setNoExcelStorageConfirm] = useState(false);

  const [restoreSessionPopup, setRestoreSessionPopup] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const {userRole, setUserRole, sessionId, setSessionId, clearUserContext} = useContext(UserContext);

  // for statistics component
   const [showStatistics, setShowStatistics] = useState(false);

  const handleShowStatistics = () => setShowStatistics(true);
  const handleHideStatistics = () => setShowStatistics(false);

  // get the employee's username and always check for sessionId
  const [username, setUsername] = useState('');
  useEffect(() => {
    async function fetchUsername() {
      const sessionDetails = getSessionDetails();
      if (sessionDetails && !sessionId) {
        setSessionId(sessionDetails.employee_id);
        console.log("[SESSION] Restoring session with ID:", sessionDetails.employeeId);
      }
      
      if (sessionId) {
        const name = await getUsername(sessionId);
        if (name) {
          setUsername(name);
        }
      }
    }
    
    fetchUsername();
  }, [sessionId]);

  const handleStartSession = async () => {
    // IMPORTANT CHANGE HERE VVVVVVVVV
    console.log("[SESSION]  current sessionId:", sessionId);
    
    const rawSessionDetails = localStorage.getItem('sessionDetails');
    
    if (rawSessionDetails) {
      try {
        const sessionDetails = JSON.parse(rawSessionDetails);
        
        setSessionId(sessionDetails.employee_id);
        console.log("[SESSION] SessionId from localStorage:", sessionDetails.token);
      } catch (error) {
        console.error("Error parsing sessionDetails from localStorage:", error);
      }
    } else {
      console.log("[SESSION] No sessionDetails found in localStorage");
    }

    const result = await startSession(sessionId); // change the return to specific values for greater user feedback
    /* console.log("Start Session Result:", await startSession(sessionId)); */
    console.log(sessionId);
    if (result) {
      setStartSessionPopup(true); 
    } else {  
      setRestoreSessionPopup(true);
    }
  };

  const handleSaveExcel = async () => {
    const result = await saveExcelFile(); // change the return to specific values for greater user feedback
    /* console.log("Start Session Result:", await startSession(sessionId)); */
    if (result) {
      setSaveExcelPopup(true); 
    } else {
      setSaveExcelFailedPopup(true);
    }
  };

  const navigate = useNavigate();

  const handleEndSession = async () => {
    const resultExcel = await saveExcelFile();

    if (resultExcel === -1) {
      setNoExcelStoragePopup(true);
      return;
    } else if (!resultExcel) {
      setEndSessionFailedPopup(true);
      return;
    }
    setLoggingOut(true);
    await handlePostEndSession();
  };

  const handlePostEndSession = async () => {
    const resultEndSession = await endSession(sessionId);
    if (!resultEndSession) {
      setEndSessionFailedPopup(true);
      setLoggingOut(false);
      return;
    } else if (resultEndSession === -2) {
      setEndSessionFailedClockOutPopup(true);
      setLoggingOut(false);
      return;
    } 

    clearUserContext();
    setEndSessionPopup(true);
    setUserRole('');
    setSessionId('');
    window.history.replaceState(null, '', '/login');
    navigate('/login');
  }

  /////////// Handle log out functionality //////////
  const [loggingOut, setLoggingOut] = useState(false);
  
  const handleLogOut = async () => {
    if (getSessionDetails().clock_out_time !== null) { return; }
    setLoggingOut(true);
    const result = await logOut(sessionId);
    console.log("Logging out with sessionId:", sessionId);
    if (result) {
      setUserRole('');
      setSessionId('');
      clearUserContext();
      window.history.replaceState(null, '', '/login');
      navigate('/login');
    }
  };

  /////////// Handle clock out functionality //////////
  const [systemLocked, setSystemLocked] = useState(false);
  
  const handleClockOut = async () => {
    const result = await clockOut(sessionId);
    if (result) {
      setSystemLocked(true); // Lock the system
      // Don't clear user context or navigate away yet
      // This keeps the session active but prevents usage
    }
  };

  // detect if previous session has clocked out but not ended
  useEffect(() => {
    async function checkSessionStatus() {
      console.log("[SESSION] Checking session status...");
      const sessionDetails = getSessionDetails();

      if (sessionDetails && sessionDetails.clock_out_time && !sessionDetails.end_time) {
        setSystemLocked(true);
      }
    }
    
    checkSessionStatus();
  }, []);

  useEffect(() => {
    const handleNoExcelConfirmation = async () => {
      if (noExcelStorageConfirm) {
        // User confirmed they want to end session without Excel file
        setNoExcelStorageConfirm(false); // Reset for next time
        await handlePostEndSession(); // Proceed with ending session
      }
    };
    handleNoExcelConfirmation();
  }, [noExcelStorageConfirm]);

  const [productList, setProductList] = useState([]);
  const [modifierList, setModifierList] = useState([]);

  useEffect(() => {
    async function loadProductData() {
      try {
        console.log("[USER CONTEXT] SessionId:", sessionId);
        
        const catalog = await fetchProductCatalog();
        console.log("STATUS:", catalog);
        
        if (catalog && Array.isArray(catalog) && catalog.length >= 2) {
          console.log("Catalog has data");
          const initializedProducts = initProductList(catalog[0]);
          const initializedModifiers = initProductList(catalog[1]);
          
          setProductList(initializedProducts);
          setModifierList(initializedModifiers);
        } else {
          console.log("Using local product data instead of API data");
          setProductList(initProductList(JSON.parse(localStorage.getItem('products'))));
          setModifierList(initProductList(JSON.parse(localStorage.getItem('modifiers'))));
        }
      } catch (error) {
        console.error("Error loading product catalog:", error);
        setProductList(initProductList(JSON.parse(localStorage.getItem('products'))));
        setModifierList(initProductList(JSON.parse(localStorage.getItem('modifiers'))));
      }
  }
  
  loadProductData();
}, []);

  ////////// Session Management //////////
  useEffect(() => {
    const justLoggedIn = localStorage.getItem('justLoggedIn') === 'true';
    
    if (justLoggedIn) {
        // Clear the flag
        localStorage.removeItem('justLoggedIn');
        
        // Start session automatically
        handleStartSession();
    }
  }, []);

  ////////// Orientation Enforcer //////////

  const [isPortrait, setIsPortrait] = useState(false);
  
  // Effect to detect orientation changes
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    if (isCordova() && window.screen && window.screen.orientation) {
      // Lock to landscape orientation
      window.screen.orientation.lock('landscape');
    }
    
    checkOrientation();
    
    window.addEventListener('resize', checkOrientation);
    
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

	return (
    // interfaces are invisible containers that hold the components
    // viewers are containers that displays a list of components (e.g. products, modifiers, trays)
    <div className="primaryInterface">
      {/* <div className="logo1"> </div>
      <div className="logo2"> </div>
      <div className="logo3"> </div> */}
      {isPortrait && (
        <div className="orientation-overlay">
          <div className="orientation-message">
            Please rotate your device to enable features.
          </div>
          <svg 
            className="rotate-icon"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M19.9381 13C19.979 12.6724 20 12.3387 20 12C20 7.58172 16.4183 4 12 4C9.49941 4 7.26684 5.14727 5.79981 6.94416M4.06189 11C4.02104 11.3276 4 11.6613 4 12C4 16.4183 7.58172 20 12 20C14.3894 20 16.5341 18.9525 18 17.2916M15 17H18V17.2916M5.79981 4V6.94416M5.79981 6.94416V6.99993L8.79981 7M18 20V17.2916"></path>
          </svg>
        </div>
      )}
      <div className="navigationViewer"> 
        <NavigationContainer 
            handleEndSession={handleEndSession} 
            handleStartSession={handleStartSession}
            saveExcelFile={handleSaveExcel}
            userRole={userRole} // This should be dynamic based on the logged-in user
            handleClockOut={handleClockOut}
            handleLogOut={handleLogOut}
            handleShowStatistics={handleShowStatistics}
        /> 
      </div>
      <div className="popUpInterface">
        <PopUp 
            text={"A new session has started, welcome " + username + "!"}
            button1={"Confirm"}
            button2={"Exit"} 
            trigger={startSessionPopup} 
            setTrigger={setStartSessionPopup} 
            confirm={confirm}
            setConfirm={setConfirm}
        />

        <PopUp 
            text={"Current session has ended"} 
            button1={"Confirm"}
            button2={"Exit"} 
            trigger={endSessionPopup} 
            setTrigger={setEndSessionPopup} 
            confirm={confirm}
            setConfirm={setConfirm}
        />
        <PopUp 
            text={"A session for " + username + " is already active. Session has been restored."} 
            button1={"Confirm"}
            button2={"Exit"} 
            trigger={restoreSessionPopup} 
            setTrigger={setRestoreSessionPopup} 
            confirm={confirm}
            setConfirm={setConfirm}
        />
        <PopUp 
            text={"Session excel file successfully uploaded!"} 
            button1={"Confirm"}
            button2={"Exit"} 
            trigger={saveExcelPopup} 
            setTrigger={setSaveExcelPopup} 
            confirm={confirm}
            setConfirm={setConfirm}
        />
        <PopUp 
            text={"Session excel file failed to upload"} 
            button1={"Confirm"}
            button2={"Exit"} 
            trigger={saveExcelFailedPopup} 
            setTrigger={setSaveExcelFailedPopup} 
            confirm={confirm}
            setConfirm={setConfirm}
        />
        <PopUp 
            text={"Session failed to close. Please check your internet connection."} 
            button1={"Confirm"}
            button2={"Exit"} 
            trigger={endSessionFailedPopup} 
            setTrigger={setEndSessionFailedPopup} 
            confirm={confirm}
            setConfirm={setConfirm}
        />
        <PopUp 
            text={"Session failed to close. Please clock out first."} 
            button1={"Confirm"}
            button2={"Exit"} 
            trigger={endSessionFailedClockOutPopup} 
            setTrigger={setEndSessionFailedClockOutPopup} 
            confirm={confirm}
            setConfirm={setConfirm}
        />
        <PopUp 
            text={"Warning. Session does not have an excel file. Continue?"} 
            button1={"Confirm"}
            button2={"Cancel"} 
            trigger={noExcelStoragePopup} 
            setTrigger={setNoExcelStoragePopup} 
            confirm={noExcelStorageConfirm}
            setConfirm={setNoExcelStorageConfirm}
        />

      </div>
      <div className="posInterface">
        <div className="productListInterface"> 
          {/* Add headers here... */}
          <div> 
            <ContentHeader titleText="PRODUCT"/>
          </div>
          
          <div className="productCategoryInterface">
            <div className="categoryViewer"> 
              <CategoryMenu 
                productList={productList} 
                handleScrollToCategory={handleScrollToCategory}
              />
            </div>      
            <div className="productViewer"> 
              {productList.map((category, index) => (
                <CategoryContainer 
                category={category} 
                type="product" 
                addToTray={addToTray}
                categoryRefs={categoryRefs}
                index={index}/>
              ))}
            </div>
          </div>
          
          <div> 
            <ContentHeader titleText="MODIFIER"/>
          </div>
          
          <div className="modifierCategoryInterface">
            <div className="categoryViewer"> 
              <CategoryMenu 
                productList={modifierList} 
                handleScrollToCategory={handleScrollToCategory}
              />
            </div>
            <div className="modifierViewer">
              {modifierList.map((category, index) => (
                <CategoryContainer 
                  category={category} 
                  type="modifier"
                  addModifier={addModifier}
                  categoryRefs={categoryRefs}
                  index={index}
                  currentProduct={currentProduct}
                  />
              ))}
            </div>
          </div>
        </div>
        
        <div className="trayInterface">
          <div className="trayHeader"> 
            <h4> Image </h4>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0' }}>
              <h4 style={{ margin: '0', marginBottom: '-1.7vh' }}> Item Name </h4>
              <h5 style={{ margin: '0' }}> <span style={{ fontSize: '1.2vh' }}>+product code </span> </h5>
            </div>  
            <h4> Qty </h4>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0' }}>
              <h4 style={{ margin: '0', marginBottom: '-1.7vh' }}> Unit Price </h4>
              <h5 style={{ margin: '0' }}> <span style={{ fontSize: '1.2vh' }}>+total price </span> </h5>
            </div> 
          </div>
          <div className="trayViewer">
            {tray.map((content) => (
                  <TrayContainer content={content} 
                  handleProductIncrement={handleProductIncrement} 
                  handleProductDecrement={handleProductDecrement} 
                  handleProductDeletion={handleProductDeletion} 
                  
                  handleModifierIncrement={handleModifierIncrement} 
                  handleModifierDecrement={handleModifierDecrement} 
                  handleModifierDeletion={handleModifierDeletion}
                  
                  setCurrentTray={setCurrentTray}
                  setCurrentProduct={setCurrentProduct}
                  
                  currentProduct={currentProduct}
                  currentTray={currentTray}
                  saveCustomerToTray={saveCustomerToTray}

                  />
            ))}
          </div>
          <div className="keypadViewer"> 
            <KeypadContainer 
              addNewTray={addNewTray} 
              currentTotal={currentTotal} 
              tray={tray} 
              clearTray={clearTray} 
              clearCurrentTray={clearCurrentTray}
              currentTray={currentTray}/>
          </div>
          
        </div>
      
      {systemLocked && (
        <div className="lock-screen-overlay">
          <div className="lock-screen-content">
            <h2>Terminal Locked</h2>
            <p>This terminal has been clocked out by {username}</p>
            <p>Please end the session to continue.</p>
          </div>
        </div>
      )}
      </div>
    {/*   <div className="navigationViewer"> 
            <NavigationContainer 
                handleEndSession={handleEndSession} 
                handleStartSession={handleStartSession}
                saveExcelFile={saveExcelFile}
                userRole={"admin"} // This should be dynamic based on the logged-in user
            /> 
      </div> */}
      {loggingOut && (
        <div className="logout-screen-overlay">
          <div className="logout-screen-content">
            <h2>Logging Out...</h2>
            <p>Please wait while we log you out.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App