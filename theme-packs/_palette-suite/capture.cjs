// Electron 离屏截图：把 _preview 下的预览 HTML 渲染成 PNG
// 用法：electron capture.cjs  （由 _palette-suite/render.ps1 调用，会先清掉 ELECTRON_RUN_AS_NODE）
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

app.disableHardwareAcceleration();

const here = __dirname;
const previewDir = path.resolve(here, "../_preview");
const shotsFile = path.join(previewDir, "shots.json");

async function shot(source, target) {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    frame: false,
    useContentSize: true,
    backgroundColor: "#101010",
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false }
  });
  await win.loadFile(source);
  await new Promise((resolve) => setTimeout(resolve, 900));
  const image = await win.webContents.capturePage();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, image.toPNG());
  console.log("captured", path.relative(previewDir, target), image.getSize());
  win.destroy();
}

app.whenReady().then(async () => {
  try {
    const { shots } = JSON.parse(fs.readFileSync(shotsFile, "utf8"));
    for (const entry of shots) {
      await shot(entry.welcome, entry.welcomePng);
      await shot(entry.reading, entry.readingPng);
    }
  } catch (error) {
    console.error("capture failed:", error);
    app.exit(1);
    return;
  }
  app.quit();
});
