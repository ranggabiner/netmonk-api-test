require("dotenv").config();

const { dialog } = require("electron");
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const { shell } = require("electron");

const API_KEY = process.env.POSTMAN_API_KEY;

// Define the mapping of report names to their corresponding Collection and Environment IDs
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

ipcMain.on("download-data", (event, { reportName }) => {
  // Use the corresponding Collection and Environment ID based on the report name
  const { COLLECTION_ID, ENVIRONMENT_ID } = reportConfigs[reportName] || {};

  if (!COLLECTION_ID || !ENVIRONMENT_ID) {
    event.reply(
      "download-error",
      `Invalid report name: ${reportName}, cannot find corresponding IDs.`
    );
    return;
  }

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
      newman run collection.json -e environment.json -r htmlextra --reporter-htmlextra-title "${reportName} Netmonk" --reporter-htmlextra-export ./newman/${reportFileName} || exit 1
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
