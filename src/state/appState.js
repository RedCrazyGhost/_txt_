import { reactive } from "vue";

const BASE_URL = import.meta.env.BASE_URL;

export const appState = reactive({
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
      { to: "/question-bank", name: "QuestionBank", label: "题库" },
      { to: "/practice-progress", name: "PracticeProgress", label: "题集进度" },
      { to: "/acknowledgements", name: "Acknowledgements", label: "鸣谢" }
    ],
    appAuthor: {
      name: "RedCrazyGhost",
      src: `${BASE_URL}IMAG/Author.jpeg`
    },
    appVersion: "2.0.1",
    appColor: "light",
    appFontFamily: "HYCuYuanJ"
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
