const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { fork } = require("child_process");
const pathDelimiter = path.delimiter;

if (process.platform === "linux") {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-dev-shm-usage");
}

if (process.platform === "linux") {
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-setuid-sandbox");
}

const WEB_PORT = Number(process.env.ELECTRON_WEB_PORT || 3210);
const DEV_SERVER_URL =
  process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";

let webServerProcess = null;
let mainWindow = null;

function getBaseDir() {
  if (app.isPackaged) {
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
    if (portableDir) {
      return path.join(portableDir, "ELYDENTData");
    }
    return path.join(app.getPath("desktop"), "ELYDENTData");
  }
  return path.join(app.getPath("desktop"), "ELYDENTData");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveSeedDbPath() {
  const projectRoot = path.resolve(__dirname, "..");
  const candidates = [
    path.join(projectRoot, "prisma", "dev.db"),
    path.join(projectRoot, "prisma", "prisma", "dev.db"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function prepareStorage() {
  const storageDir = getBaseDir();
  ensureDir(storageDir);

  const uploadsDir = path.join(storageDir, "uploads");
  ensureDir(uploadsDir);

  const docsDir = path.join(storageDir, "session-documents");
  ensureDir(docsDir);

  const dbPath = path.join(storageDir, "dentit.db");
  if (!fs.existsSync(dbPath)) {
    const seed = resolveSeedDbPath();
    if (seed) {
      fs.copyFileSync(seed, dbPath);
    } else {
      fs.writeFileSync(dbPath, "");
    }
  }

  return { storageDir, dbPath };
}

function startWebServer() {
  return new Promise((resolve, reject) => {
    const { storageDir, dbPath } = prepareStorage();
    const script = path.join(__dirname, "start-next.cjs");
    const appDir = path.resolve(__dirname, "..");
    const prismaRuntimePath = path.join(appDir, "prisma-runtime");
    const nodePath = process.env.NODE_PATH
      ? `${prismaRuntimePath}${pathDelimiter}${process.env.NODE_PATH}`
      : prismaRuntimePath;

    webServerProcess = fork(script, [], {
      cwd: appDir,
      env: {
        ...process.env,
        NODE_ENV: "production",
        ELECTRON_WEB_PORT: String(WEB_PORT),
        DENTIT_STORAGE_DIR: storageDir,
        DATABASE_URL: `file:${dbPath.replace(/\\/g, "/")}`,
        ELECTRON_RUN_AS_NODE: "1",
        NODE_PATH: nodePath,
      },
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });

    const timeout = setTimeout(() => {
      reject(new Error("Dentit web server start timeout"));
    }, 30000);

    webServerProcess.on("message", (message) => {
      if (message && message.type === "ready") {
        clearTimeout(timeout);
        resolve();
      }
    });

    webServerProcess.on("exit", (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Dentit web server exited with code ${code}`));
      }
    });

    webServerProcess.on("error", (error) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `Dentit web server process error: ${error?.message || error}`,
        ),
      );
    });
  });
}

function createWindow(targetUrl) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      dialog.showErrorBox(
        "ELYDENT load error",
        `Failed to load ${validatedURL || targetUrl}\n\n${errorCode}: ${errorDescription}`,
      );
    },
  );

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    dialog.showErrorBox(
      "ELYDENT renderer crashed",
      `Reason: ${details?.reason || "unknown"}`,
    );
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.loadURL(targetUrl);
}

app.whenReady().then(async () => {
  try {
    if (app.isPackaged) {
      await startWebServer();
      createWindow(`http://127.0.0.1:${WEB_PORT}`);
    } else {
      createWindow(DEV_SERVER_URL);
    }
  } catch (error) {
    dialog.showErrorBox(
      "Dentit desktop startup error",
      String(error?.message || error),
    );
    app.quit();
  }
});

app.on("before-quit", () => {
  if (webServerProcess && !webServerProcess.killed) {
    webServerProcess.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
