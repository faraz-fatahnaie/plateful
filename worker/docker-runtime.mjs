import { spawn } from "node:child_process";

const children = [
  spawn(process.execPath, ["worker/transcript-proxy.mjs"], { stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "0.0.0.0", "--port", "3000"], { stdio: "inherit" }),
];

function stop(signal) {
  children.forEach((child) => child.kill(signal));
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
children.forEach((child) => child.on("exit", (code) => {
  stop("SIGTERM");
  process.exit(code || 0);
}));
