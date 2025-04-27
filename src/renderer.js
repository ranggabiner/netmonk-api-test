const { ipcRenderer } = require("electron");
const path = require("path");

const downloadBtn = document.getElementById("download-btn");
const loader = document.getElementById("loader");

downloadBtn.addEventListener("click", () => {
  const reportName = document.querySelector(
    'input[name="reportName"]:checked'
  ).value;

  loader.style.display = "block";
  downloadBtn.disabled = true;
  downloadBtn.innerText = "Downloading...";
  downloadBtn.style.backgroundColor = "#a9a9a9";

  ipcRenderer.send("download-data", { reportName });

  ipcRenderer.removeAllListeners("download-complete");
  ipcRenderer.removeAllListeners("download-error");

  ipcRenderer.on("download-complete", (event, { message, folderPath }) => {
    console.log("Download complete event received");
    loader.style.display = "none";
    downloadBtn.disabled = false;
    downloadBtn.innerText = "Download Collection & Environment";
    downloadBtn.style.backgroundColor = "#4caf50";

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
    console.log("Download error event received:", errorMessage);
    // HIDE loader + ENABLE tombol + Balikin warna normal
    loader.style.display = "none";
    downloadBtn.disabled = false;
    downloadBtn.innerText = "Download Collection & Environment";
    downloadBtn.style.backgroundColor = "#4caf50"; // Balikin ke hijau

    ipcRenderer.send("show-dialog", {
      type: "error",
      title: "Download Gagal",
      message: `Error: ${errorMessage}`,
      buttons: ["OK"],
    });
  });
});
