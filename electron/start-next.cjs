const http = require("http");
const next = require("next");
const path = require("path");
const fs = require("fs");

const appDir = path.resolve(__dirname, "..");
const port = Number(process.env.ELECTRON_WEB_PORT || 3210);

const app = next({ dev: false, dir: appDir });

app
  .prepare()
  .then(() => {
    const handler = app.getRequestHandler();
    const server = http.createServer((req, res) => handler(req, res));
    server.listen(port, "127.0.0.1", () => {
      if (process.send) {
        process.send({ type: "ready", port });
      }
      console.log(
        `[Dentit Electron] Server running on http://127.0.0.1:${port}`,
      );
    });
  })
  .catch((err) => {
    console.error("[Dentit Electron] Next startup failed", err);
    process.exit(1);
  });
