import { createServer } from "vite";
import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");
const base = process.env.BASE_URL || readFileSync(resolve(root, "vite.config.ts"), "utf8").match(/base:\s*"([^"]+)"/)?.[1] || "/";

function withBase(path) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.replace(/^\//, "");
  return `${normalizedBase}${normalizedPath}`.replace(/\/{2,}/g, "/");
}

function findAsset(prefix, ext) {
  const assetsDir = resolve(distDir, "assets");
  const match = readdirSync(assetsDir).find((name) => name.startsWith(prefix) && name.endsWith(ext));
  if (!match) {
    throw new Error(`未在 dist/assets 中找到 ${prefix}*${ext}`);
  }
  return withBase(`assets/${match}`);
}

const vite = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom"
});

const { default: IntroView } = await vite.ssrLoadModule("/src/views/IntroView.vue");
const app = createSSRApp(IntroView);
const appHtml = await renderToString(app);
await vite.close();

const appCss = findAsset("app-", ".css");
const introCss = findAsset("IntroView-", ".css");
const template = readFileSync(resolve(root, "intro.html"), "utf8");

const styleBlock = [
  `<link rel="stylesheet" crossorigin href="${appCss}">`,
  `<link rel="stylesheet" href="${introCss}">`
].join("\n    ");

const html = template
  .replace("<!--intro-styles-->", styleBlock)
  .replace(
    /<!--intro-html-->[\s\S]*?<\/body>/,
    `<!--intro-html-->\n    <div id="app" data-server-rendered="true">${appHtml}</div>\n  </body>`
  )
  .replace(/\s*<script type="module" src="\/src\/intro-main\.ts"><\/script>\s*/g, "\n");

const output = resolve(distDir, "intro.html");
writeFileSync(output, html);

const introDir = resolve(distDir, "intro");
mkdirSync(introDir, { recursive: true });
writeFileSync(resolve(introDir, "index.html"), html);

console.log(`[prerender-intro] wrote ${output}`);
console.log(`[prerender-intro] wrote ${resolve(introDir, "index.html")}`);
