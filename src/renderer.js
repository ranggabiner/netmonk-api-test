const { ipcRenderer } = require("electron");

document.getElementById("download-btn").addEventListener("click", () => {
  ipcRenderer.send("download-data");

  ipcRenderer.removeAllListeners("download-complete");
  ipcRenderer.removeAllListeners("download-error");

  ipcRenderer.on("download-complete", (event, { message, folderPath }) => {
    ipcRenderer.send("show-dialog", {
      type: "info",
      title: "Download Selesai",
      message: message,
      buttons: ["OK", "Buka Folder"],
      folderPath: folderPath,
    });
  });

  ipcRenderer.on("download-error", (event, errorMessage) => {
    ipcRenderer.send("show-dialog", {
      type: "error",
      title: "Download Gagal",
      message: `Error: ${errorMessage}`,
      buttons: ["OK"],
    });
  });
});
