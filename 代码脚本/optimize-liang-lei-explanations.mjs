/**
 * 优化两类人员题集 explanation 字段：
 * - 去除章节前缀【...】及「及题干设问」等套话
 * - 按题型生成紧扣法条/题干的解析
 *
 * 用法：
 *   node optimize-liang-lei-explanations.mjs --dry-run
 *   node optimize-liang-lei-explanations.mjs --stage [目录]
 *   node optimize-liang-lei-explanations.mjs --apply --confirm [stage目录]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BANK_DIR = path.join(
  ROOT,
  "QuestionJSON/道路旅客、普通货运、危货运输两类人员"
);
const DEFAULT_STAGE = path.join(__dirname, ".stage-explanations");

const FILES = [
  { name: "公共题集.json", expectedCount: 698 },
  { name: "专业题集.json", expectedCount: 837 }
];

/** 法规全称 → 简称 */
const LAW_SHORT = {
  中华人民共和国安全生产法: "安全生产法",
  中华人民共和国道路交通安全法: "道路交通安全法",
  中华人民共和国刑法: "刑法",
  中华人民共和国消防法: "消防法",
  中华人民共和国突发事件应对法: "突发事件应对法",
  中华人民共和国反恐怖主义法: "反恐怖主义法",
  中华人民共和国职业病防治法: "职业病防治法",
  中华人民共和国劳动法: "劳动法",
  中华人民共和国民法典: "民法典",
  中华人民共和国道路交通安全法实施条例: "道路交通安全法实施条例",
  生产安全事故报告和调查处理条例: "生产安全事故报告和调查处理条例",
  中华人民共和国道路运输条例: "道路运输条例",
  生产安全事故应急条例: "生产安全事故应急条例",
  道路运输车辆技术管理规定: "道路运输车辆技术管理规定",
  道路运输车辆动态监督管理办法: "道路运输车辆动态监督管理办法",
  道路运输从业人员管理规定: "道路运输从业人员管理规定",
  企业安全生产费用提取和使用管理办法: "企业安全生产费用提取和使用管理办法",
  生产安全事故应急预案管理办法: "生产安全事故应急预案管理办法",
  道路旅客运输及客运站管理规定: "道路旅客运输及客运站管理规定",
  道路货物运输及站场管理规定: "道路货物运输及站场管理规定",
  道路危险货物运输管理规定: "道路危险货物运输管理规定",
  营运客车安全技术条件: "营运客车安全技术条件",
  道路旅客运输企业安全管理规范: "道路旅客运输企业安全管理规范",
  道路危险货物运输企业安全管理规范: "道路危险货物运输企业安全管理规范",
  道路运输企业安全生产管理规范: "道路运输企业安全生产管理规范",
  建筑设计防火规范: "建筑设计防火规范",
  汽车运输危险货物规则: "汽车运输危险货物规则",
  危险货物品名表: "危险货物品名表",
  机动车运行安全技术条件: "机动车运行安全技术条件",
  中共中央国务院关于推进安全生产领域改革发展的意见:
    "关于推进安全生产领域改革发展的意见",
  "中共中央 国务院关于推进安全生产领域改革发展的意见":
    "关于推进安全生产领域改革发展的意见"
};

/** 题干关键词 → 法条要点（部分高频考点） */
const ARTICLE_HINTS = [
  {
    test: (stem) => /非高危.*(?:100人|（\s*）)/.test(stem) || /从业人员在.*非高危/.test(stem),
    text: "《安全生产法》第二十四条：从业人员在100人以下的非高危行业生产经营单位，可以不设安全生产管理机构，但至少应配备兼职安全生产管理人员"
  },
  {
    test: (stem) => /高危/.test(stem) && /投保|保险/.test(stem),
    text: "《安全生产法》第五十一条：国家规定的高危行业、领域生产经营单位应当投保安全生产责任保险"
  },
  {
    test: (stem) => /同时设计、同时施工、同时投入生产/.test(stem),
    text: "《安全生产法》第三十一条：建设项目的安全设施须与主体工程同时设计、同时施工、同时投入生产和使用"
  },
  {
    test: (stem) => /免除或者减轻.*责任/.test(stem),
    text: "《安全生产法》第五十二条：生产经营单位不得以任何形式与从业人员订立协议，免除或减轻其对从业人员因生产安全事故伤亡依法应承担的责任"
  },
  {
    test: (stem) => /特种作业/.test(stem),
    text: "《安全生产法》第三十条：生产经营单位特种作业人员须经专门培训，取得相应资格方可上岗"
  },
  {
    test: (stem) => /直接危及人身安全.*停止作业|停止作业.*撤离/.test(stem),
    text: "《安全生产法》第五十七条：从业人员发现直接危及人身安全的紧急情况时，有权停止作业或在采取可能的应急措施后撤离作业场所"
  },
  {
    test: (stem) => /人民至上.*生命至上|生命至上.*人民至上/.test(stem),
    text: "《安全生产法》第三条：安全生产工作应当坚持人民至上、生命至上"
  },
  {
    test: (stem) => /管行业必须管安全/.test(stem),
    text: "《安全生产法》第三条：安全生产工作实行管行业必须管安全、管业务必须管安全、管生产经营必须管安全"
  },
  {
    test: (stem) => /不属于.*安全生产.*方针|安全生产管理方针/.test(stem),
    text: "《安全生产法》第三条：安全生产工作方针为安全第一、预防为主、综合治理"
  },
  {
    test: (stem) => /因生产安全事故受到损害|获得赔偿的权利/.test(stem),
    text: "《安全生产法》第五十六条：因生产安全事故受到损害的从业人员，除依法享有工伤保险外，依照有关民事法律尚有获得赔偿的权利的，有权提出赔偿要求"
  },
  {
    test: (stem) => /班车.*固定.*线路|包车客运|旅游客运/.test(stem),
    text: "《道路旅客运输及客运站管理规定》：班车客运按固定线路、时间、站点、班次运行；包车、旅游客运方式不同"
  },
  {
    test: (stem) => /定制客运/.test(stem),
    text: "《道路旅客运输及客运站管理规定》：定制客运车辆可在班线起讫地、中途停靠地城市市区、县城城区按乘客需求停靠"
  },
  {
    test: (stem) => /实习学生|实习的/.test(stem),
    text: "《安全生产法》第二十八条：接收实习学生的，应对实习学生进行安全生产教育和培训，提供必要劳动防护用品"
  },
  {
    test: (stem) => /员工宿舍/.test(stem),
    text: "《安全生产法》第四十二条：生产、经营、储存、使用危险物品的车间、商店、仓库不得与员工宿舍在同一座建筑物内"
  },
  {
    test: (stem) => /工伤保险/.test(stem),
    text: "《安全生产法》第五十一条：生产经营单位必须依法参加工伤保险，为从业人员缴纳保险费"
  },
  {
    test: (stem) => /安全生产教育和培训合格.*上岗|先上岗/.test(stem),
    text: "《安全生产法》第二十八条、第三十条：未经安全生产教育和培训合格的从业人员，不得上岗作业"
  }
];

function stripSectionPrefix(text) {
  return (text || "").replace(/^【[^】]*】\s*/, "").trim();
}

function extractLawFromStem(stem) {
  const m = (stem || "").match(/(?:根据|依据)《([^》]+)》/);
  return m ? m[1] : null;
}

function shortLawName(fullName) {
  if (!fullName) return "相关法规";
  return LAW_SHORT[fullName] || fullName.replace(/^中华人民共和国/, "");
}

function stripStemLawPrefix(stem) {
  return (stem || "")
    .replace(/^(?:根据|依据)《[^》]+》，?\s*/, "")
    .trim();
}

function getAnswerKeys(question) {
  const keys = [];
  for (const slot of question.answers || []) {
    for (const key of slot || []) keys.push(key);
  }
  return keys;
}

function getOptionText(question, key) {
  return question.options?.find((o) => o.key === key)?.text || "";
}

function fillBlanks(stem, text) {
  return stem
    .replace(/（\s*）|\(\s*\)|（  ）|\(  \)/g, text)
    .replace(/\s+/g, " ")
    .trim();
}

function formatAnswerKeys(keys) {
  return keys.join("");
}

function isNegativeStem(stem) {
  return /以下说法错误|不正确的是|错误的是|不包括|不属于|不符合|有误的是/.test(
    stem || ""
  );
}

/** 题干末尾为「以下说法正确/错误的是（ ）」——选项即各说法，不应把答案填入括号 */
function isStatementChoiceStem(stem) {
  return /以下说法(?:正确|错误)的是\s*[（(]\s*[）)]\s*。?$/.test(
    (stem || "").replace(/\s/g, "")
  );
}

function hasInlineBlank(stem) {
  return /（\s*）|\(\s*\)/.test(stem || "") && !isStatementChoiceStem(stem);
}

function isWellCitedExplanation(exp) {
  const body = stripSectionPrefix(exp);
  // 已有具体法条序号且非套话模板，仅做前缀清理
  return (
    /《[^》]+》第[一二三四五六七八九十百千\d]+条/.test(body) &&
    !/及题干设问/.test(body) &&
    !/^【/.test(exp)
  );
}

function cleanupWellCited(exp) {
  let body = stripSectionPrefix(exp);
  body = body.replace(/题干将[^。]+填入空白处，/, "");
  return body;
}

function findArticleHint(stem) {
  for (const hint of ARTICLE_HINTS) {
    if (hint.test(stem)) return hint.text;
  }
  return null;
}

function judgmentFalseNote(stemBody) {
  if (/无需|不必|可以不|无权|允许先|方可不|仅.*方可/.test(stemBody)) {
    return "题干以放宽或免除法定义务的表述与强制性规定不符";
  }
  if (/可以与.*同一座|保持安全距离/.test(stemBody)) {
    return "法律禁止与员工宿舍同处一建筑物，而非仅保持安全距离";
  }
  if (/仅.*超过.*方可|只有.*方可/.test(stemBody)) {
    return "法律对安全生产管理机构的设置条件与题干限缩表述不一致";
  }
  return "题干表述与法律规定不一致";
}

function optimizeSingleChoice(question) {
  const stem = question.stem || "";
  const lawFull = extractLawFromStem(stem);
  const law = shortLawName(lawFull);
  const keys = getAnswerKeys(question);
  const key = keys[0] || "";
  const answerText = getOptionText(question, key);
  const stemBody = stripStemLawPrefix(stem);
  const hint = findArticleHint(stem);

  if (isNegativeStem(stem)) {
    const basis = hint || `《${law}》`;
    const reason = hint
      ? `选项${key}「${answerText}」不属于上述法定内容`
      : `选项${key}「${answerText}」与法律规定不符`;
    return `${basis}。${reason}，故应选 ${key}。`;
  }

  if (isStatementChoiceStem(stem)) {
    if (hint) return `${hint}。应选 ${key}。`;
    return `《${law}》规定：${answerText}。应选 ${key}。`;
  }

  if (hint) {
    return `${hint}。应选 ${key}（${answerText}）。`;
  }

  if (hasInlineBlank(stem)) {
    const filled = fillBlanks(stemBody, answerText).replace(/。$/, "");
    return `《${law}》规定：${filled}。应选 ${key}。`;
  }

  return `《${law}》规定：${answerText}。应选 ${key}。`;
}

function optimizeMultipleChoice(question) {
  const stem = question.stem || "";
  const lawFull = extractLawFromStem(stem);
  const law = shortLawName(lawFull);
  const keys = getAnswerKeys(question);
  const texts = keys.map((k) => getOptionText(question, k)).filter(Boolean);
  const hint = findArticleHint(stem);
  const keyStr = formatAnswerKeys(keys);
  const optionList = texts.map((t, i) => `${keys[i]}.${t}`).join("；");

  if (hint) {
    return `${hint}。${optionList}均符合规定。应选 ${keyStr}。`;
  }

  const stemBody = stripStemLawPrefix(stem).replace(/。$/, "");
  const shortStem = stemBody.length > 60 ? `${stemBody.slice(0, 57)}…` : stemBody;

  return `依据《${law}》（${shortStem}），${optionList}均符合题意。应选 ${keyStr}。`;
}

function optimizeJudgment(question) {
  const stem = question.stem || "";
  const lawFull = extractLawFromStem(stem);
  const law = shortLawName(lawFull);
  const isTrue = getAnswerKeys(question)[0] === "A";
  const stemBody = stripStemLawPrefix(stem).replace(/。$/, "");
  const hint = findArticleHint(stem);

  if (isTrue) {
    const basis = hint || `《${law}》`;
    return `${basis}。${stemBody}。表述符合法律规定，故判断为正确。`;
  }

  const basis = hint || `《${law}》`;
  const note = judgmentFalseNote(stemBody);
  return `${basis}。${note}：${stemBody}。故判断为错误。`;
}

function optimizeExplanation(question) {
  const old = question.explanation || "";
  const cleaned = stripSectionPrefix(old);

  if (isWellCitedExplanation(old)) {
    const refined = cleanupWellCited(old);
    return refined === old ? old : refined;
  }

  // 已有法条引用但带章节前缀或套话，保留正文并清理
  if (/《[^》]+》第/.test(cleaned) && !/及题干设问/.test(cleaned)) {
    return cleanupWellCited(old);
  }

  const type = question.questionType;
  if (type === "singleChoice") return optimizeSingleChoice(question);
  if (type === "multipleChoice" || type === "multiChoice") {
    return optimizeMultipleChoice(question);
  }
  if (type === "judgment" || type === "trueFalse") {
    return optimizeJudgment(question);
  }

  return cleaned || old;
}

function applyOptimizations(data, fileLabel) {
  const changes = [];
  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i];
    const before = q.explanation || "";
    const after = optimizeExplanation(q);
    if (before !== after) {
      q.explanation = after;
      changes.push({
        file: fileLabel,
        index: i + 1,
        questionType: q.questionType,
        before,
        after
      });
    }
  }
  return changes;
}

function loadBank(fileName) {
  const filePath = path.join(BANK_DIR, fileName);
  return { filePath, data: JSON.parse(fs.readFileSync(filePath, "utf8")) };
}

function writeBank(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function summarizeChanges(changes) {
  const byFile = {};
  const byType = {};
  for (const c of changes) {
    byFile[c.file] = (byFile[c.file] || 0) + 1;
    byType[c.questionType] = (byType[c.questionType] || 0) + 1;
  }
  return { total: changes.length, byFile, byType };
}

function printPreview(changes, limit = 8) {
  console.log("\n=== 典型 before / after 示例 ===");
  for (const c of changes.slice(0, limit)) {
    console.log(`\n[${c.file} #${c.index} ${c.questionType}]`);
    console.log("BEFORE:", c.before.slice(0, 200));
    console.log("AFTER: ", c.after.slice(0, 200));
  }
}

function runStage(stageDir) {
  fs.mkdirSync(stageDir, { recursive: true });
  const allChanges = [];

  for (const { name, expectedCount } of FILES) {
    const { data } = loadBank(name);
    if (data.questions.length !== expectedCount) {
      throw new Error(`${name}: expected ${expectedCount}, got ${data.questions.length}`);
    }
    const version = data.version;
    const cloned = JSON.parse(JSON.stringify(data));
    const changes = applyOptimizations(cloned, name);
    if (cloned.version !== version) {
      throw new Error(`${name}: version must not change`);
    }
    allChanges.push(...changes);
    const out = path.join(stageDir, name);
    writeBank(out, cloned);
    console.log(`Staged ${out} (${changes.length} explanation changes)`);
  }

  const report = {
    stagedAt: new Date().toISOString(),
    stageDir,
    summary: summarizeChanges(allChanges),
    samples: allChanges.slice(0, 20).map(({ before, after, ...rest }) => ({
      ...rest,
      beforePreview: before.slice(0, 300),
      afterPreview: after.slice(0, 300)
    }))
  };
  const reportPath = path.join(stageDir, "preview-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nPreview report: ${reportPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
  printPreview(allChanges);
  return { allChanges, reportPath };
}

function runApply(stageDir) {
  for (const { name } of FILES) {
    const staged = path.join(stageDir, name);
    const target = path.join(BANK_DIR, name);
    if (!fs.existsSync(staged)) {
      throw new Error(`Missing staged file: ${staged}`);
    }
    const stagedData = JSON.parse(fs.readFileSync(staged, "utf8"));
    const { data: origData } = loadBank(name);
    if (stagedData.version !== origData.version) {
      throw new Error(`${name}: staged version differs from original — abort`);
    }
    writeBank(target, stagedData);
    console.log(`Applied ${staged} → ${target}`);
  }
}

function runDryRun() {
  const allChanges = [];
  for (const { name } of FILES) {
    const { data } = loadBank(name);
    const cloned = JSON.parse(JSON.stringify(data));
    allChanges.push(...applyOptimizations(cloned, name));
  }
  console.log("[dry-run] No files written.");
  console.log(JSON.stringify(summarizeChanges(allChanges), null, 2));
  printPreview(allChanges);
  return allChanges;
}

const args = process.argv.slice(2);
if (args.includes("--dry-run")) {
  runDryRun();
} else if (args.includes("--stage")) {
  const idx = args.indexOf("--stage");
  const dir = path.resolve(args[idx + 1] || DEFAULT_STAGE);
  runStage(dir);
} else if (args.includes("--apply")) {
  if (!args.includes("--confirm")) {
    console.error("Apply requires --confirm (user approved guard stage).");
    process.exit(1);
  }
  const idx = args.indexOf("--apply");
  const dir = path.resolve(args[idx + 1] && !args[idx + 1].startsWith("--") ? args[idx + 1] : DEFAULT_STAGE);
  runApply(dir);
} else {
  console.log(`Usage:
  node optimize-liang-lei-explanations.mjs --dry-run
  node optimize-liang-lei-explanations.mjs --stage [目录]
  node optimize-liang-lei-explanations.mjs --apply --confirm [stage目录]`);
}
