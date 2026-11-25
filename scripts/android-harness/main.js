'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 430,
    height: 900,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
});

app.on('window-all-closed', () => app.quit());
