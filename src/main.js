const path = require("path");
const fs = require("fs");
let envPath = path.join(__dirname, "..", ".env");
if (process.resourcesPath) {
  const packagedEnvPath = path.join(process.resourcesPath, ".env");
  if (fs.existsSync(packagedEnvPath)) {
    envPath = packagedEnvPath;
  }
}
require("dotenv").config({ path: envPath });

const { dialog } = require("electron");
const { app, BrowserWindow, ipcMain } = require("electron");
const { exec } = require("child_process");
const { shell } = require("electron");
const os = require("os");

const API_KEY = process.env.POSTMAN_API_KEY;

const reportConfigs = {
  HI: {
    COLLECTION_ID: process.env.HI_COLLECTION_ID,
    ENVIRONMENT_ID: process.env.HI_ENVIRONMENT_ID,
  },
  Prime: {
    COLLECTION_ID: process.env.PRIME_COLLECTION_ID,
    ENVIRONMENT_ID: process.env.PRIME_ENVIRONMENT_ID,
  },
  Portal: {
    COLLECTION_ID: process.env.PORTAL_COLLECTION_ID,
    ENVIRONMENT_ID: process.env.PORTAL_ENVIRONMENT_ID,
  },
};

function createWindow() {
  const win = new BrowserWindow({
    width: 720,
    height: 512,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.setTitle("Netmonk");
  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  app.dock.setIcon(path.join(__dirname, "assets", "netmonk_api_test.png"));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("download-data", async (event, { reportName }) => {
  const { COLLECTION_ID, ENVIRONMENT_ID } = reportConfigs[reportName] || {};

  if (!COLLECTION_ID || !ENVIRONMENT_ID) {
    event.reply("download-error", `Invalid report name: ${reportName}`);
    return;
  }

  const targetDir = path.join(app.getPath("documents"), "postman_newman");
  const now = new Date();
  const timeString = now
    .toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(/\//g, "-")
    .replace(/ /, "_")
    .replace(/,/g, "");

  const reportFileName = `${reportName}_Report_${timeString}.html`;

  const runNewmanScript = `
    #!/bin/bash
    set -e

    export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin
    mkdir -p "${targetDir}"
    cd "${targetDir}"

    echo "Running Newman langsung dari URL 📡..."
    newman run "https://api.getpostman.com/collections/${COLLECTION_ID}?apikey=${API_KEY}" \\
      --environment "https://api.getpostman.com/environments/${ENVIRONMENT_ID}?apikey=${API_KEY}" \\
      -r htmlextra \\
      --reporter-htmlextra-title "${reportName} Netmonk" \\
      --reporter-htmlextra-export "${reportFileName}"
    echo "Newman run complete 🎯"
  `;

  const newmanScriptPath = path.join(os.tmpdir(), `newman_${Date.now()}.sh`);

  try {
    fs.writeFileSync(newmanScriptPath, runNewmanScript, { mode: 0o755 });
  } catch (err) {
    console.error(`Error writing temp script: ${err}`);
    event.reply("download-error", `Gagal nulis script: ${err.message}`);
    return;
  }

  exec(`bash "${newmanScriptPath}"`, (err, stdout, stderr) => {
    fs.unlink(newmanScriptPath, () => {});

    console.log(`Newman success: ${stdout}`);

    const message = "Download & Testing sukses guys!";
    const folderPath = path.join(targetDir);
    event.reply("download-complete", { message, folderPath });
  });
});

ipcMain.on(
  "show-dialog",
  (event, { type, title, message, buttons, folderPath, reportPath }) => {
    const dialogOptions = {
      type: type || "info",
      title: title || "Informasi",
      message: message || "",
      buttons: buttons || ["OK"],
    };

    dialog.showMessageBox(null, dialogOptions).then((result) => {
      if (buttons && result.response === buttons.indexOf("Buka Report")) {
        if (reportPath) {
          shell.openPath(folderPath);
          shell.openPath(reportPath);
        } else {
          dialog.showErrorBox("Error", "Report tidak ditemukan.");
        }
      }
    });
  }
);
