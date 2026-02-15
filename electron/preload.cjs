const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("dentitDesktop", {
  runtime: "electron",
});
