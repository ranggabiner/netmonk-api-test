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
    width: 512,
    height: 512,
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

  const targetDir = path.join(app.getPath("documents"), "postman_exports");
  const collectionPath = path.join(targetDir, "collection.json");
  const environmentPath = path.join(targetDir, "environment.json");

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (err) {
    console.error(`Error creating dir: ${err}`);
    event.reply("download-error", `Gagal buat folder: ${err.message}`);
    return;
  }

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

  const downloadScript = `
    #!/bin/bash
    set -e

    echo "Downloading Postman Collection..."
    curl --silent --location --request GET "https://api.getpostman.com/collections/${COLLECTION_ID}" --header "X-Api-Key: ${API_KEY}" -o "${collectionPath}"
    echo "Collection downloaded"

    echo "Downloading Postman Environment..."
    curl --silent --location --request GET "https://api.getpostman.com/environments/${ENVIRONMENT_ID}" --header "X-Api-Key: ${API_KEY}" -o "${environmentPath}"
    echo "Environment downloaded"
  `;

  const runNewmanScript = `
    #!/bin/bash
    set -e

    export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin
    cd "${targetDir}"

    echo "Running Newman..."
    newman run collection.json -e environment.json -r htmlextra --reporter-htmlextra-title "${reportName} Netmonk" --reporter-htmlextra-export ./newman/${reportFileName}
    echo "Newman run complete"
  `;

  const downloadScriptPath = path.join(
    os.tmpdir(),
    `download_${Date.now()}.sh`
  );
  const newmanScriptPath = path.join(os.tmpdir(), `newman_${Date.now()}.sh`);

  try {
    fs.writeFileSync(downloadScriptPath, downloadScript, { mode: 0o755 });
    fs.writeFileSync(newmanScriptPath, runNewmanScript, { mode: 0o755 });
  } catch (err) {
    console.error(`Error writing temp scripts: ${err}`);
    event.reply("download-error", `Gagal nulis script: ${err.message}`);
    return;
  }

  exec(`bash "${downloadScriptPath}"`, (downloadErr, stdout, stderr) => {
    fs.unlink(downloadScriptPath, () => {});

    if (downloadErr) {
      console.error(`Download error: ${stderr}`);
      event.reply("download-error", `Gagal download data: ${stderr}`);
      return;
    }

    console.log(`Download success: ${stdout}`);

    exec(
      `bash "${newmanScriptPath}"`,
      (newmanErr, newmanStdout, newmanStderr) => {
        fs.unlink(newmanScriptPath, () => {});

        if (newmanErr) {
          console.error(`Newman error: ${newmanStderr}`);
          event.reply("download-error", `Gagal run newman: ${newmanStderr}`);
          return;
        }

        console.log(`Newman success: ${newmanStdout}`);

        const message = "Download & Testing sukses guys!";
        const folderPath = path.join(targetDir, "newman");
        event.reply("download-complete", { message, folderPath });
      }
    );
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
