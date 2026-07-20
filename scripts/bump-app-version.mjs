import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PKG_PATH = path.join(root, "package.json");
const LOCK_PATH = path.join(root, "package-lock.json");
const APP_STATE_PATH = path.join(root, "src/state/appState.ts");

function bumpPatch(version) {
  const parts = version.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`Invalid semver: ${version}`);
  }

  const patch = Number(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

const pkg = readJson(PKG_PATH);
const currentVersion = pkg.version;
const newVersion = bumpPatch(currentVersion);

if (newVersion === currentVersion) {
  process.exit(0);
}

pkg.version = newVersion;
writeJson(PKG_PATH, pkg);

const lock = readJson(LOCK_PATH);
lock.version = newVersion;
if (lock.packages?.[""]) {
  lock.packages[""].version = newVersion;
}
writeJson(LOCK_PATH, lock);

const appState = fs.readFileSync(APP_STATE_PATH, "utf8");
const updatedAppState = appState.replace(/(appVersion:\s*")([^"]+)(")/, `$1${newVersion}$3`);
if (updatedAppState === appState) {
  throw new Error("Could not update appVersion in src/state/appState.ts");
}
fs.writeFileSync(APP_STATE_PATH, updatedAppState);

console.log(`Version bumped: ${currentVersion} -> ${newVersion}`);
