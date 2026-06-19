import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

const targetUrl = process.env.LIGHTHOUSE_URL;
const THRESHOLD_PERFORMANCE = Number(process.env.LH_THRESHOLD_PERFORMANCE || 70);
const THRESHOLD_SEO = Number(process.env.LH_THRESHOLD_SEO || 85);
const THRESHOLD_BEST_PRACTICES = Number(process.env.LH_THRESHOLD_BEST_PRACTICES || 85);
const MAX_ATTEMPTS = Number(process.env.LH_MAX_ATTEMPTS || 1);

if (!targetUrl) {
  console.log("LIGHTHOUSE_URL 未设置，跳过 Lighthouse 检查。");
  process.exit(0);
}

function scoreFailed(report) {
  return (
    report.performance < THRESHOLD_PERFORMANCE ||
    report.seo < THRESHOLD_SEO ||
    report.bestPractices < THRESHOLD_BEST_PRACTICES
  );
}

async function runOnce() {
  const chrome = await launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"]
  });
  try {
    const result = await lighthouse(targetUrl, {
      port: chrome.port,
      output: "json",
      onlyCategories: ["performance", "seo", "best-practices"]
    });
    const { categories } = result.lhr;
    return {
      performance: categories.performance.score * 100,
      seo: categories.seo.score * 100,
      bestPractices: categories["best-practices"].score * 100
    };
  } finally {
    await chrome.kill();
  }
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const report = await runOnce();
  console.log(`Lighthouse 分数 (第 ${attempt}/${MAX_ATTEMPTS} 次):`, report);
  if (!scoreFailed(report)) {
    process.exit(0);
  }
  if (attempt < MAX_ATTEMPTS) {
    console.log("未达阈值，3 秒后重试…");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

console.log("阈值要求:", {
  performance: THRESHOLD_PERFORMANCE,
  seo: THRESHOLD_SEO,
  bestPractices: THRESHOLD_BEST_PRACTICES
});
process.exitCode = 1;
