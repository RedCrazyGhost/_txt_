import type { RouteRecordRaw } from "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    description?: string;
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
    path: "/intro",
    redirect: "/home"
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
    name: "Editor",
    path: "/editor",
    component: () => import("../views/editor/EditorWorkspaceView.vue"),
    meta: {
      title: "题集编辑 - _txt_",
      description: "工作台双栏题集编辑：录入、导入、保存到本地题库或导出。"
    }
  },
  {
    path: "/editor/workspace",
    redirect: "/editor"
  },
  {
    path: "/editor/focus",
    redirect: "/editor"
  },
  {
    path: "/editor/studio",
    redirect: "/editor"
  },
  {
    name: "Practice",
    path: "/practice",
    component: () => import("../views/PracticeView.vue"),
    meta: {
      title: "做题页 - _txt_",
      description: "从题库选择题集后开始练习与巩固。"
    }
  },
  {
    name: "PracticeProgress",
    path: "/practice-progress",
    component: () => import("../views/PracticeProgressView.vue"),
    meta: {
      title: "练习档案 - _txt_",
      description: "按题库管理做题本，并从错题生成错题本复习。"
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
    redirect: "/home"
  },
  { path: "/:pathMatch(.*)*", redirect: "/home" }
];

export default routes;
