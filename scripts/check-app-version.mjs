import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const appState = fs.readFileSync(path.join(root, "src/state/appState.ts"), "utf8");
const match = appState.match(/appVersion:\s*"([^"]+)"/);

if (!match) {
  console.error("Could not find appVersion in src/state/appState.ts");
  process.exit(1);
}

const appVersion = match[1];
if (pkg.version !== appVersion) {
  console.error(
    `Version mismatch: package.json=${pkg.version}, appState.ts appVersion=${appVersion}`
  );
  process.exit(1);
}

console.log(`App version check passed: ${pkg.version}`);
