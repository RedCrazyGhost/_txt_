import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_BANK_DIR = path.join(
  ROOT,
  "QuestionJSON/道路旅客、普通货运、危货运输两类人员"
);

const FILES = [
  { name: "公共题集.json", expectedCount: 698 },
  { name: "专业题集.json", expectedCount: 837 }
];

const CHOICE_TYPES = new Set([
  "singleChoice",
  "multipleChoice",
  "multiChoice",
  "judgment",
  "trueFalse"
]);

function validateFile(filePath, expectedCount) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const questions = data.questions || [];
  const issues = [];

  if (questions.length !== expectedCount) {
    issues.push({
      type: "count_mismatch",
      expected: expectedCount,
      actual: questions.length
    });
  }

  questions.forEach((question, index) => {
    const n = index + 1;
    const type = question.questionType;

    if (type === "multiChoice") {
      issues.push({ type: "legacy_multiChoice", n });
    }
    if (type === "trueFalse") {
      issues.push({ type: "legacy_trueFalse", n });
    }

    if (CHOICE_TYPES.has(type)) {
      if (!Array.isArray(question.options) || question.options.length === 0) {
        issues.push({ type: "missing_options", n, questionType: type });
      } else {
        const keys = new Set(question.options.map((item) => item.key));
        for (const slot of question.answers || []) {
          for (const key of slot || []) {
            if (!keys.has(key)) {
              issues.push({ type: "invalid_answer_key", n, key, keys: [...keys] });
            }
          }
        }
      }
    }

    if (question.stem && /\nE\.\s/.test(question.stem)) {
      issues.push({ type: "stem_embedded_E", n });
    }

    if (n === 1 && Array.isArray(question.options)) {
      const optionD = question.options.find((item) => item.key === "D");
      if (optionD?.text === "l000人") {
        issues.push({ type: "typo_l000", n });
      }
    }
  });

  return { filePath, questionCount: questions.length, issues };
}

function main() {
  const bankDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_BANK_DIR;

  let failed = false;
  const reports = [];

  for (const { name, expectedCount } of FILES) {
    const filePath = path.join(bankDir, name);
    const report = validateFile(filePath, expectedCount);
    reports.push({
      file: name,
      questionCount: report.questionCount,
      issueCount: report.issues.length,
      issues: report.issues
    });
    if (report.issues.length > 0) failed = true;
  }

  console.log(JSON.stringify(reports, null, 2));
  if (failed) {
    console.error("Validation failed.");
    process.exit(1);
  }
  console.log("Validation passed.");
}

main();
