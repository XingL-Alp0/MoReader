// Electron 离屏截图：把预览 HTML 渲染成 PNG
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

app.disableHardwareAcceleration();

const here = __dirname;
const jobs = [
  ["preview_welcome.html", "preview_welcome.png"],
  ["preview_reading.html", "preview_reading.png"]
];

async function shot(source, target) {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    frame: false,
    backgroundColor: "#0a0814",
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false }
  });
  await win.loadFile(path.join(here, source));
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(here, target), image.toPNG());
  console.log("captured", target, image.getSize());
  win.destroy();
}

app.whenReady().then(async () => {
  try {
    for (const [source, target] of jobs) {
      await shot(source, target);
    }
  } catch (error) {
    console.error("capture failed:", error);
    app.exit(1);
    return;
  }
  app.quit();
});
