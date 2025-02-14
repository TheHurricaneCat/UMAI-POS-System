const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // Load React from the local build instead of the browser
  mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));

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