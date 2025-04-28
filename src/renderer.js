const { ipcRenderer } = require("electron");
const path = require("path");

const downloadBtn = document.getElementById("download-btn");
const loaderLine = document.getElementById("loader-line");
const vpnCheckboxContainer = document.getElementById("vpn-checkbox-container");
const vpnCheckbox = document.getElementById("vpn-checkbox");

function generateLoaderLines() {
  const loaderLine = document.getElementById("loader-line");

  loaderLine.innerHTML = "";

  const spanWidth = 6 + 4;

  const count = Math.floor(window.innerWidth / spanWidth);

  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");

    const randomDelay = (Math.random() * 0.5).toFixed(2);
    span.style.animationDelay = `${randomDelay}s`;

    loaderLine.appendChild(span);
  }
}

window.addEventListener("DOMContentLoaded", generateLoaderLines);

window.addEventListener("resize", generateLoaderLines);

document.querySelectorAll('input[name="reportName"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "HI") {
      vpnCheckboxContainer.style.display = "block";
      downloadBtn.disabled = true;
      downloadBtn.style.backgroundColor = "#a9a9a9";
    } else {
      vpnCheckboxContainer.style.display = "none";
      vpnCheckbox.checked = false;
      downloadBtn.disabled = false;
      downloadBtn.style.backgroundColor = "#ef5b25";
    }
  });
});

vpnCheckbox.addEventListener("change", () => {
  if (vpnCheckbox.checked) {
    downloadBtn.disabled = false;
    downloadBtn.style.backgroundColor = "#ef5b25";
  } else {
    downloadBtn.disabled = true;
    downloadBtn.style.backgroundColor = "#a9a9a9";
  }
});

downloadBtn.addEventListener("click", () => {
  const reportName = document.querySelector(
    'input[name="reportName"]:checked'
  ).value;

  document.querySelectorAll('input[name="reportName"]').forEach((radio) => {
    radio.disabled = true;
  });

  downloadBtn.disabled = true;
  downloadBtn.innerText = "Loading...";
  downloadBtn.style.backgroundColor = "#a9a9a9";

  loaderLine.style.display = "flex";

  ipcRenderer.send("download-data", { reportName });

  ipcRenderer.removeAllListeners("download-complete");
  ipcRenderer.removeAllListeners("download-error");

  ipcRenderer.on("download-complete", (event, { message, folderPath }) => {
    loaderLine.style.display = "none";
    downloadBtn.disabled = false;
    downloadBtn.innerText = "START";
    downloadBtn.style.backgroundColor = "#ef5b25";

    document.querySelectorAll('input[name="reportName"]').forEach((radio) => {
      radio.disabled = false;
    });

    const fs = require("fs");

    let reportPath = null;
    try {
      if (!fs.existsSync(folderPath)) {
        console.error("Folder tidak ditemukan:", folderPath);
        throw new Error("Folder newman tidak ditemukan");
      }

      const files = fs.readdirSync(folderPath);
      const htmlFiles = files.filter((file) => file.endsWith(".html"));

      if (htmlFiles.length > 0) {
        let latestFile = htmlFiles
          .map((file) => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            return { file: filePath, mtime: stats.mtime };
          })
          .sort((a, b) => b.mtime - a.mtime)[0];

        reportPath = latestFile.file;
        console.log("Report path found:", reportPath);
      } else {
        console.error("Tidak ada file HTML di folder");
      }
    } catch (error) {
      console.error("Error mencari file report:", error);
    }

    ipcRenderer.send("show-dialog", {
      type: "info",
      title: "Download Selesai",
      message: message,
      buttons: ["OK", "Buka Report"],
      folderPath: folderPath,
      reportPath: reportPath,
    });
  });

  ipcRenderer.on("download-error", (event, errorMessage) => {
    loaderLine.style.display = "none";
    downloadBtn.disabled = false;
    downloadBtn.innerText = "START";
    downloadBtn.style.backgroundColor = "#ef5b25";

    document.querySelectorAll('input[name="reportName"]').forEach((radio) => {
      radio.disabled = false;
    });

    ipcRenderer.send("show-dialog", {
      type: "error",
      title: "Download Gagal",
      message: `Error: ${errorMessage}`,
      buttons: ["OK"],
    });
  });
});
