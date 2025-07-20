const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1900,
    height: 800,
    // remove these security risks here
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    }
  });

  mainWindow.setMenu(null);

  // Always open DevTools regardless of environment
  /* mainWindow.webContents.openDevTools(); */

  // Handle development vs production loading
  if (process.env.NODE_ENV === 'development') {
    // Load from Vite dev server
    mainWindow.loadURL('https://localhost:5173/#/');
    mainWindow.webContents.openDevTools();
  } else {
    // Load from built files
    mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
  }

  // Log loading status
  mainWindow.webContents.once('did-finish-load', () => {
    console.log("Application loaded successfully!");
  });
  
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("Failed to load:", errorDescription);
    
    // Retry loading in case of failure
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:5173/#/');
      }, 1000);
    }
  });

  // Log paths for debugging
  console.log('App Path:', app.getAppPath());
  console.log('Loading from:', process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5173/#/' 
    : path.join(app.getAppPath(), "dist", "index.html")
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when app is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, recreate window when dock icon is clicked
app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  }
});