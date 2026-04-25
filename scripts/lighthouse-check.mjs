import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

const targetUrl = process.env.LIGHTHOUSE_URL;
const THRESHOLD_PERFORMANCE = Number(process.env.LH_THRESHOLD_PERFORMANCE || 70);
const THRESHOLD_SEO = Number(process.env.LH_THRESHOLD_SEO || 85);
const THRESHOLD_BEST_PRACTICES = Number(process.env.LH_THRESHOLD_BEST_PRACTICES || 85);

if (!targetUrl) {
  console.log("LIGHTHOUSE_URL 未设置，跳过 Lighthouse 检查。");
  process.exit(0);
}

const chrome = await launch({ chromeFlags: ["--headless"] });
try {
  const result = await lighthouse(targetUrl, {
    port: chrome.port,
    output: "json",
    onlyCategories: ["performance", "seo", "best-practices"]
  });
  const { categories } = result.lhr;
  const report = {
    performance: categories.performance.score * 100,
    seo: categories.seo.score * 100,
    bestPractices: categories["best-practices"].score * 100
  };
  console.log("Lighthouse 分数:", report);
  const failed =
    report.performance < THRESHOLD_PERFORMANCE ||
    report.seo < THRESHOLD_SEO ||
    report.bestPractices < THRESHOLD_BEST_PRACTICES;
  if (failed) {
    console.log("阈值要求:", {
      performance: THRESHOLD_PERFORMANCE,
      seo: THRESHOLD_SEO,
      bestPractices: THRESHOLD_BEST_PRACTICES
    });
    process.exitCode = 1;
  }
} finally {
  await chrome.kill();
}
