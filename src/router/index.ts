import type { RouteRecordRaw } from "vue-router";
import { isOnboardingDone } from "../services/appPrefsStorage";

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    description?: string;
    immersive?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    name: "Home",
    path: "/home",
    component: () => import("../views/HomeView.vue"),
    meta: {
      title: "_txt_ 是一个帮助人们进行知识巩固的网站",
      description: "做知识点笔记、复习巩固、每日练习。"
    }
  },
  {
    name: "Intro",
    path: "/intro",
    component: () => import("../views/IntroView.vue"),
    meta: {
      immersive: true,
      title: "介绍 - _txt_",
      description: "题集编辑、题库管理、练习巩固，一图了解 _txt_ 怎么用。"
    }
  },
  {
    name: "QuestionBank",
    path: "/question-bank",
    component: () => import("../views/QuestionBankView.vue"),
    meta: {
      title: "题库管理 - _txt_",
      description: "本地题库与远程题库管理、编辑与上传。"
    }
  },
  {
    name: "Practice",
    path: "/practice",
    component: () => import("../views/PracticeView.vue"),
    meta: {
      title: "Step 3 做题页 - _txt_",
      description: "从题库选择题集后开始练习与巩固。"
    }
  },
  {
    name: "PracticeProgress",
    path: "/practice-progress",
    component: () => import("../views/PracticeProgressView.vue"),
    meta: {
      title: "题集进度 - _txt_",
      description: "查看与管理本地保存的题集进度，继续未完成练习。"
    }
  },
  {
    name: "Settings",
    path: "/settings",
    component: () => import("../views/SettingsView.vue"),
    meta: {
      title: "设置 - _txt_",
      description: "外观、AI 模型与本地存储相关配置。"
    }
  },
  {
    name: "Acknowledgements",
    path: "/acknowledgements",
    redirect: { path: "/settings", query: { section: "about" } }
  },
  {
    path: "/",
    redirect: () => (isOnboardingDone() ? "/home" : "/intro")
  },
  { path: "/:pathMatch(.*)*", redirect: "/home" }
];

export default routes;
