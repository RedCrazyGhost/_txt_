import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VERSION_FILES = ["package.json", "package-lock.json", "src/state/appState.js"];

function readPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  return pkg.version;
}

function compareSemver(a, b) {
  const parse = (version) => version.split(".").map(Number);
  const [aMajor, aMinor, aPatch] = parse(a);
  const [bMajor, bMinor, bPatch] = parse(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

function getRemoteVersion(remoteRef, remoteUrl) {
  const branch = remoteRef.replace(/^refs\/heads\//, "").replace(/^origin\//, "");

  if (remoteUrl) {
    try {
      const ref = `refs/heads/${branch}`;
      const output = execSync(`git ls-remote "${remoteUrl}" "${ref}"`, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }).trim();
      const remoteSha = output.split(/\s+/)[0];
      if (!remoteSha) {
        return null;
      }
      const content = execSync(`git show ${remoteSha}:package.json`, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
      return JSON.parse(content).version;
    } catch {
      return null;
    }
  }

  try {
    const remoteBranch = branch.startsWith("origin/") ? branch : `origin/${branch}`;
    const content = execSync(`git show ${remoteBranch}:package.json`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return JSON.parse(content).version;
  } catch {
    return null;
  }
}

function hasUncommittedVersionChanges() {
  const status = execSync("git status --porcelain", { cwd: root, encoding: "utf8" });
  return status
    .split("\n")
    .filter(Boolean)
    .some((line) => VERSION_FILES.some((file) => line.includes(file)));
}

function readPushRemoteRef() {
  const input = fs.readFileSync(0, "utf8").trim();
  if (!input) {
    return "refs/heads/main";
  }

  for (const line of input.split("\n")) {
    const [, localSha, remoteRef] = line.split(/\s+/);
    if (localSha !== "0000000000000000000000000000000000000000" && remoteRef) {
      return remoteRef;
    }
  }

  return "refs/heads/main";
}

const remoteRef = readPushRemoteRef();
const remoteUrl = process.argv[3] || "";
const localVersion = readPackageVersion();
const remoteVersion = getRemoteVersion(remoteRef, remoteUrl);

if (remoteVersion && compareSemver(localVersion, remoteVersion) <= 0) {
  console.log(
    `Local version ${localVersion} is not greater than remote ${remoteVersion}. Bumping patch...`
  );

  const bumpResult = spawnSync("npm", ["run", "version:patch"], {
    cwd: root,
    stdio: "inherit",
    shell: true
  });

  if (bumpResult.status !== 0) {
    process.exit(bumpResult.status ?? 1);
  }

  if (hasUncommittedVersionChanges()) {
    const newVersion = readPackageVersion();
    console.error("");
    console.error(`版本已 bump 至 ${newVersion}，请先 commit 以下文件再 push：`);
    for (const file of VERSION_FILES) {
      console.error(`  - ${file}`);
    }
    process.exit(1);
  }
}
