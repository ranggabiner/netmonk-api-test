require("dotenv").config();

const { dialog } = require("electron");
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const { shell } = require("electron");

const API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_ID = process.env.COLLECTION_ID;
const ENVIRONMENT_ID = process.env.ENVIRONMENT_ID;

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

ipcMain.on("download-data", (event) => {
  const targetDir = path.join(
    process.env.HOME || process.env.USERPROFILE,
    "Documents",
    "postman_exports"
  );
  const collectionPath = path.join(targetDir, "collection.json");
  const environmentPath = path.join(targetDir, "environment.json");

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (dirError) {
    console.error(`Error creating directory: ${dirError}`);
    event.reply(
      "download-error",
      `Gagal membuat direktori: ${dirError.message}`
    );
    return;
  }

  const script = `
      #!/bin/bash
      echo "Starting download..."

      curl --silent --location --request GET "https://api.getpostman.com/collections/${COLLECTION_ID}" \
      --header "X-Api-Key: ${API_KEY}" \
      -o "${collectionPath}" || exit 1 # Keluar jika curl gagal

      echo "Downloaded collection.json"

      curl --silent --location --request GET "https://api.getpostman.com/environments/${ENVIRONMENT_ID}" \
      --header "X-Api-Key: ${API_KEY}" \
      -o "${environmentPath}" || exit 1 # Keluar jika curl gagal

      echo "Downloaded environment.json"

      # Pastikan newman ada dalam PATH atau gunakan path absolut
      export PATH=$PATH:/usr/local/bin

      cd "${targetDir}" || exit 1
      echo "Running newman..."
      newman run collection.json -e environment.json -r htmlextra || exit 1
    `;

  const scriptPath = path.join(__dirname, "temp_script.sh");
  try {
    fs.writeFileSync(scriptPath, script, { mode: 0o755 });
  } catch (writeError) {
    console.error(`Error writing script file: ${writeError}`);
    event.reply(
      "download-error",
      `Gagal menulis script sementara: ${writeError.message}`
    );
    return;
  }

  exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
    fs.unlink(scriptPath, (unlinkErr) => {
      if (unlinkErr) console.error(`Error deleting temp script: ${unlinkErr}`);
    });

    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);

    const message = "Download dan test berhasil!";
    const folderPath = path.join(targetDir, "newman");

    event.reply("download-complete", { message, folderPath });
  });
});

ipcMain.on(
  "show-dialog",
  (event, { type, title, message, buttons, folderPath }) => {
    const dialogOptions = {
      type: type || "info",
      title: title || "Informasi",
      message: message || "",
      buttons: buttons || ["OK"],
    };

    dialog.showMessageBox(null, dialogOptions).then((result) => {
      if (result.response === 1 && folderPath) {
        shell.openPath(folderPath);
      }
    });
  }
);
