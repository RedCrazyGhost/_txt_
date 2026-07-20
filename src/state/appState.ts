import { reactive } from "vue";
import type { Question } from "../models/question/types";
import type { AppTheme } from "../services/appPrefsStorage";

const BASE_URL = import.meta.env.BASE_URL;

export interface AppCoinPerson {
  name: string;
  src: string;
  iclass: string;
}

export interface AppRouterItem {
  to: string;
  name: string;
  label: string;
}

export interface AppAuthor {
  name: string;
  src: string;
}

export interface GithubRepo {
  owner: string;
  repo: string;
}

export interface WebSiteConfig {
  appEmoji: string[];
  appCoinPerson: AppCoinPerson[];
  appRouters: AppRouterItem[];
  appAuthor: AppAuthor;
  appVersion: string;
  appColor: AppTheme;
  appFontFamily: string;
  githubRepo: GithubRepo;
}

export interface TxtEntry {
  txt: string;
  MD5: boolean;
  image: string;
  noDelete: boolean;
  /** 题目解析（可选） */
  explanation?: string;
}

export interface QuestionsJSON {
  bankId: string;
  bankSource: string;
  version: string;
  name: string;
  type: string;
  author: string;
  questions: Question[];
  CreateTime?: string;
}

export interface AppState {
  webSiteConfig: WebSiteConfig;
  txts: TxtEntry[];
  questionsJSON: QuestionsJSON;
  papers: unknown[];
}

export const appState = reactive<AppState>({
  webSiteConfig: {
    appEmoji: [
      "angry",
      "dizzy",
      "flushed",
      "frown",
      "frown-open",
      "grimace",
      "grin",
      "grin-alt",
      "grin-beam",
      "grin-beam-sweat",
      "grin-hearts",
      "grin-squint",
      "grin-squint-tears",
      "grin-stars",
      "grin-tears",
      "grin-tongue",
      "grin-tongue-squint",
      "grin-tongue-wink",
      "grin-wink",
      "kiss",
      "kiss-beam",
      "kiss-wink-heart",
      "laugh",
      "laugh-beam",
      "laugh-squint",
      "laugh-wink",
      "meh",
      "meh-blank",
      "meh-rolling-eyes",
      "sad-cry",
      "sad-tear",
      "smile",
      "smile-beam",
      "smile-wink",
      "surprise",
      "tired"
    ],
    appCoinPerson: [{ name: "莲", src: "", iclass: "kiss" }],
    appRouters: [
      { to: "/home", name: "Home", label: "首页" },
      { to: "/intro?flow=product", name: "Intro", label: "介绍" },
      { to: "/question-bank", name: "QuestionBank", label: "题库" },
      { to: "/practice-progress", name: "PracticeProgress", label: "题集进度" },
      { to: "/settings", name: "Settings", label: "设置" }
    ],
    appAuthor: {
      name: "RedCrazyGhost",
      src: `${BASE_URL}images/Author.jpeg`
    },
    appVersion: "2.0.12",
    appColor: "light",
    appFontFamily: "HYCuYuanJ",
    githubRepo: {
      owner: "RedCrazyGhost",
      repo: "_txt_"
    }
  },
  txts: [{ txt: "", MD5: false, image: "", noDelete: false }],
  questionsJSON: {
    bankId: "",
    bankSource: "",
    version: "0.0.2",
    name: "",
    type: "",
    author: "",
    questions: []
  },
  papers: []
});
