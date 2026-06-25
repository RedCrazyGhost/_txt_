import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BANK_DIR = path.join(
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

function optionKeysFromAnswers(question) {
  const keys = new Set();
  for (const slot of question.answers || []) {
    for (const key of slot || []) keys.add(key);
  }
  return keys;
}

function fixMissingOptions(question, index) {
  const type = question.questionType;
  if (!CHOICE_TYPES.has(type)) return null;
  if (Array.isArray(question.options) && question.options.length > 0) return null;
  if (!question.stem || !question.stem.includes("\n")) return null;

  const lines = question.stem.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const stem = lines[0];
  const optionLines = lines.slice(1);
  const options = optionLines.map((text, i) => ({
    key: String.fromCharCode(65 + i),
    text
  }));

  return {
    kind: "missing_options",
    index: index + 1,
    stem,
    options
  };
}

function fixStemEmbeddedE(question, index) {
  if (!question.stem || !/\nE\.\s/.test(question.stem)) return null;

  const match = question.stem.match(/\nE\.\s(.+)$/s);
  if (!match) return null;

  const eText = match[1].trim();
  const stemWithoutE = question.stem.replace(/\nE\.\s.+$/s, "").trimEnd();
  const answerKeys = optionKeysFromAnswers(question);
  const needsOption = answerKeys.has("E");

  if (needsOption) {
    const options = Array.isArray(question.options) ? [...question.options] : [];
    const existingE = options.find((item) => item.key === "E");
    if (!existingE) {
      options.push({ key: "E", text: eText });
    } else if (existingE.text !== eText) {
      existingE.text = eText;
    }
    return {
      kind: "stemE_needs_option",
      index: index + 1,
      stem: stemWithoutE,
      options
    };
  }

  return {
    kind: "stemE_orphan",
    index: index + 1,
    stem: stemWithoutE
  };
}

function fixL000Typo(question, index) {
  if (index !== 0) return null;
  if (!Array.isArray(question.options)) return null;
  const optionD = question.options.find((item) => item.key === "D");
  if (!optionD || optionD.text !== "l000人") return null;
  return {
    kind: "typo_l000",
    index: 1,
    optionKey: "D",
    text: "1000人"
  };
}

function applyFixes(data, fileLabel) {
  const changes = [];
  const questions = data.questions;

  questions.forEach((question, index) => {
    const missing = fixMissingOptions(question, index);
    if (missing) {
      question.stem = missing.stem;
      question.options = missing.options;
      changes.push({ file: fileLabel, ...missing });
    }

    const stemE = fixStemEmbeddedE(question, index);
    if (stemE) {
      question.stem = stemE.stem;
      if (stemE.options) question.options = stemE.options;
      changes.push({ file: fileLabel, ...stemE });
    }

    const typo = fixL000Typo(question, index);
    if (typo) {
      const target = question.options.find((item) => item.key === typo.optionKey);
      if (target) target.text = typo.text;
      changes.push({ file: fileLabel, ...typo });
    }

    if (question.questionType === "multiChoice") {
      question.questionType = "multipleChoice";
      changes.push({
        file: fileLabel,
        kind: "multiChoice_rename",
        index: index + 1
      });
    }
  });

  return changes;
}

function loadBank(fileName) {
  const filePath = path.join(BANK_DIR, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  return { filePath, data };
}

function writeBank(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function summarize(changes) {
  const byKind = {};
  for (const change of changes) {
    byKind[change.kind] = (byKind[change.kind] || 0) + 1;
  }
  return byKind;
}

function run({ dryRun = false, stageDir = null } = {}) {
  const allChanges = [];

  for (const { name, expectedCount } of FILES) {
    const { filePath, data } = loadBank(name);
    const beforeCount = data.questions.length;
    if (beforeCount !== expectedCount) {
      throw new Error(`${name}: expected ${expectedCount} questions, got ${beforeCount}`);
    }

    const changes = applyFixes(data, name);
    allChanges.push(...changes);

    if (dryRun) continue;

    const outPath = stageDir
      ? path.join(stageDir, name)
      : filePath;

    if (stageDir) {
      fs.mkdirSync(stageDir, { recursive: true });
    }

    writeBank(outPath, data);
    console.log(`Wrote ${outPath} (${data.questions.length} questions, ${changes.length} changes)`);
  }

  console.log(JSON.stringify({ summary: summarize(allChanges), changes: allChanges }, null, 2));
  return allChanges;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

if (dryRun) {
  const changes = [];
  for (const { name } of FILES) {
    const { data } = loadBank(name);
    const cloned = JSON.parse(JSON.stringify(data));
    changes.push(...applyFixes(cloned, name));
  }
  console.log("[dry-run] No files written.");
  console.log(JSON.stringify({ summary: summarize(changes), changes }, null, 2));
} else if (args.includes("--stage")) {
  const dir = path.resolve(args[args.indexOf("--stage") + 1] || path.join(__dirname, ".stage"));
  run({ stageDir: dir });
} else {
  run({});
}
