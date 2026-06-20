const routes = [
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
    name: "Acknowledgements",
    path: "/acknowledgements",
    component: () => import("../views/AcknowledgementsView.vue"),
    meta: {
      title: "鸣谢 - _txt_",
      description: "感谢所有贡献者、赞助者与开源社区的支持。"
    }
  },
  { path: "/", redirect: "/home" },
  { path: "/:pathMatch(.*)*", redirect: "/home" }
];

export default routes;
