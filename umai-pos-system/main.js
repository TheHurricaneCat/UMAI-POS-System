const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1900,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    }
  });

  // Load React from the local build instead of the browser
  mainWindow.loadFile(path.join(__dirname, "dist/index.html"));

  mainWindow.webContents.once('did-finish-load', () => {
    console.log("React app loaded successfully!");
  });
  
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("Failed to load page:", errorDescription);
  });

  console.log('App Path:', app.getAppPath());
  console.log('Loading:', path.join(app.getAppPath(), "dist", "index.html"));
  
  mainWindow.webContents.openDevTools();
  

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/* mainWindow.webContents.openDevTools(); */