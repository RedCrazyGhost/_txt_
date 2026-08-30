export interface HomeLandingFeature {
  icon: string;
  title: string;
  desc: string;
}

export interface HomeLandingCta {
  to: string;
  label: string;
  primary?: boolean;
}

export interface HomeLandingSection {
  id: string;
  label: string;
  title: string;
  desc: string;
  tone: "soft" | "cool" | "ink";
  features: HomeLandingFeature[];
  ctas?: HomeLandingCta[];
}

export const HOME_HERO = {
  headline: "把笔记变成可练习的知识",
  subtitle: "_txt_ 是一个帮助人们进行知识巩固的学习工具。",
  bullets: ["把笔记整理成题集", "本地题库管理与远程下载", "做题练习、记录进度、随时复盘"] as const,
  ctas: [
    { to: "/question-bank", label: "进入题库", primary: true },
    { to: "/editor", label: "新建题集", primary: false }
  ] as HomeLandingCta[]
};

export const HOME_SECTIONS: HomeLandingSection[] = [
  {
    id: "editor",
    label: "题集编辑",
    title: "手动整理，或让 AI 帮你出题",
    desc: "在编辑器里逐题完善 txt、配图与解析，也能用自然语言快速生成题集。",
    tone: "soft",
    features: [
      { icon: "fas fa-keyboard", title: "手动录入", desc: "逐题填写 txt、配图与解析说明" },
      { icon: "fas fa-robot", title: "AI 生成", desc: "配置模型后，用自然语言描述即可出题" },
      { icon: "fas fa-image", title: "题目配图", desc: "支持为每道题附加示意图" },
      { icon: "fas fa-lightbulb", title: "解析字段", desc: "为每题补充讲解，方便复盘巩固" }
    ],
    ctas: [{ to: "/editor", label: "打开编辑器", primary: true }]
  },
  {
    id: "banks",
    label: "题库与进度",
    title: "集中管理，随时续练",
    desc: "本地题库与内置远程题库统一管理，未完成练习自动记录进度。",
    tone: "cool",
    features: [
      { icon: "fas fa-folder-open", title: "本地题库", desc: "编辑、搜索、删除本地题集；草稿与发布一目了然" },
      { icon: "fas fa-cloud-download-alt", title: "远程题库", desc: "从内置网络题库下载到本地继续练" },
      { icon: "fas fa-history", title: "练习档案", desc: "按题库管理做题本，并从错题生成错题本复习" },
      { icon: "fas fa-search", title: "快速检索", desc: "按名称、科目、作者筛选题集" }
    ],
    ctas: [
      { to: "/question-bank", label: "打开题库", primary: true },
      { to: "/practice-progress", label: "练习档案", primary: false }
    ]
  },
  {
    id: "practice",
    label: "练习巩固",
    title: "即时判题，进度留在本机",
    desc: "从题库开练，结果实时记录；纯前端运行，数据保存在本地。",
    tone: "soft",
    features: [
      { icon: "fas fa-pen", title: "多种题型", desc: "单选、多选、判断、填空等自动识别" },
      { icon: "fas fa-check-circle", title: "即时判题", desc: "提交后立刻看到对错与解析" },
      { icon: "fas fa-comments", title: "AI 答疑", desc: "练习时可就当前题目向 AI 提问" },
      { icon: "fas fa-database", title: "本地同步", desc: "进度写入 localStorage，刷新不丢失" }
    ],
    ctas: [{ to: "/question-bank", label: "去题库开练", primary: true }]
  }
];

export const HOME_FINALE = {
  title: "准备好了？",
  desc: "纯前端开源学习工具。主题与 AI 可随时在设置中配置，数据只保存在本机。",
  primaryCta: { to: "/question-bank", label: "开始使用" } as HomeLandingCta,
  aboutTo: "/settings?section=about"
};
