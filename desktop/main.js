const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const PROJECT_ROOT = path.join(__dirname, "..");
const PYTHON_EXE = path.join(PROJECT_ROOT, "venv", "Scripts", "python.exe");
const HOST = "127.0.0.1";
const PORT = 8000;
const BASE_URL = `http://${HOST}:${PORT}`;

let backendProcess = null;
let mainWindow = null;

function startBackend() {
  backendProcess = spawn(
    PYTHON_EXE,
    ["-m", "uvicorn", "api.main:app", "--host", HOST, "--port", String(PORT)],
    { cwd: PROJECT_ROOT }
  );

  backendProcess.stdout.on("data", (data) => console.log(`[backend] ${data}`));
  backendProcess.stderr.on("data", (data) => console.error(`[backend] ${data}`));
  backendProcess.on("exit", (code) => console.log(`[backend] exited with code ${code}`));
}

function waitForBackend(retries = 40) {
  return new Promise((resolve, reject) => {
    const tryConnect = (remaining) => {
      http
        .get(`${BASE_URL}/api/config/status`, () => resolve())
        .on("error", () => {
          if (remaining <= 0) {
            reject(new Error("Le backend n'a pas démarré à temps."));
          } else {
            setTimeout(() => tryConnect(remaining - 1), 500);
          }
        });
    };
    tryConnect(retries);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0c10",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
    },
  });
  mainWindow.loadURL(BASE_URL);
}

app.whenReady().then(async () => {
  startBackend();
  try {
    await waitForBackend();
  } catch (e) {
    console.error(e);
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  app.quit();
});

app.on("before-quit", () => {
  if (backendProcess) backendProcess.kill();
});
