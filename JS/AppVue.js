window.addEventListener('beforeunload', function (event) {
    event.preventDefault();
    event.returnValue = "1";
});
Vue.mixin({
    methods: {
        // time相关使用
        zeroFill(i) {
            if (i >= 0 && i <= 9) {
                return "0" + i;
            } else {
                return i;
            }
        },
        // YYYY-MM-DD hh:mm:ss
        getTime(date) {

            var month = this.zeroFill(date.getMonth() + 1); //月
            var day = this.zeroFill(date.getDate()); //日
            var hour = this.zeroFill(date.getHours()); //时
            var minute = this.zeroFill(date.getMinutes()); //分
            var second = this.zeroFill(date.getSeconds()); //秒

            //当前时间
            var Time = date.getFullYear() + "-" + month + "-" + day +
                " " + hour + ":" + minute + ":" + second;

            return Time;
        },
        // YYYY
        getTimeYYYY(date) {
            return date.getFullYear();
        },
        // YYYY-MM
        getTimeYYYYMM(date) {
            var month = this.zeroFill(date.getMonth() + 1); //月

            //当前时间
            var Time = date.getFullYear() + "-" + month;

            return Time;
        },
        // YYYY-MM-DD
        getTimeYYYYMMDD(date) {
            var month = this.zeroFill(date.getMonth() + 1); //月
            var day = this.zeroFill(date.getDate()); //日
            //当前时间
            var Time = date.getFullYear() + "-" + month + "-" + day;

            return Time;
        },

        // 数量百分比
        numberToPercent(numer1, number2) {
            return numer1 / number2 * 100
        },
        // 获取所有对的答案数量
        TrueAnswerNumber() {
            let trueNumber = 0;
            this.data.QuestionsJSON.questions.forEach(question => {
                question.answers.forEach((answer, index) => {
                    if (this.judgeAnswerTrue(question, index)) {
                        trueNumber++;
                    }
                })
            })
            return trueNumber;
        },
        // 获取所有答案数量
        AllAnswerNumber() {
            let number = 0;
            this.data.QuestionsJSON.questions.forEach(question => {
                question.answers.forEach(answer => {
                    number++;
                })
            })
            return number;
        },
        // 判断题目正确错误IClass
        judgeAnswerTrueIClass(question) {
            let trueNumber = 0
            for (let index = 0; index < question.answers.length; index++) {
                if (this.judgeAnswerTrue(question, index)) {
                    trueNumber++;
                }
            }
            if (trueNumber == question.results.length) {
                return "fas fa-check fa-3x text-success"
            } else {
                return "fas fa-exclamation fa-3x text-danger"
            }
        },

        // 判断答案正确/错误
        judgeAnswerTrue(question, index) {
            let isTrue = false
            question.answers[index].forEach(answer => {
                if (question.MD5) {
                    if (md5(question.results[index]) == answer) {
                        isTrue = true
                    }
                } else {
                    if (question.results[index] == answer) {
                        isTrue = true
                    }
                }

            })
            return isTrue;
        },
        // 答案颜色
        resultColor(question, index) {
            return this.judgeAnswerTrue(question, index) ? "var(--bs-green)" : "var(--bs-red)";
        },
        // 答案展示
        answerShow(question) {
            let oldvalue = new Array(question.results.length)
            question.results = question.answers
            setTimeout(() => {
                question.results = oldvalue
            }, 5000);
        },
        // 判断主题颜色对字体进行颜色修改
        judgeColorChangeFontColor(color) {
            switch (color) {
                case "light":
                    return "dark";
                case "dark":
                    return "light";
            }
        },
        // 
        async getQuestionJSON(filepath, toData) {
            let url = filepath + '.json'
            let _this = this
            axios.get(url)
                .then(function (response) {
                    switch (toData) {
                        case "data":
                            _this.data.QuestionsJSON = response.data
                            break;
                        case "daliy":
                            _this.data.Daliy = response.data
                            break;
                        case "paperlist":
                            _this.data.Papers = response.data
                            break;
                        case "daliylist":
                            _this.data.Daliys = response.data
                            break;
                    }
                })
                .catch(function (error) {
                    console.log(error);
                });
        }
    },
})

var app = new Vue({
    el: '#App',
    created() {
        this.getQuestionJSON('QuestionJSON/paper/List', 'paperlist')
        this.getQuestionJSON('QuestionJSON/daliy/List', 'daliylist')
    },
    data() {
        return {
            data: {
                words:[],
                Daliy: {},
                WebSiteConfig: {
                    AppEmoji: [
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
                        "tired",
                    ],
                    AppCoinPerson: [{
                        name: "莲",
                        src: "",
                        iclass: "kiss"
                    }],
                    AppRouters: [{
                            to: "/Home",
                            name: "Home",
                            class: "active"
                        }, {
                            to: "/Daily",
                            name: "Daily",
                            class: ""
                        },
                        {
                            to: "/About",
                            name: "About",
                            class: ""
                        },
                    ],
                    AppAuthor: {
                        name: "RedCrazyGhost",
                        src: "IMAG/Author.jpeg",
                    },
                    AppVersion: "1.0.13",
                    AppColor: "light",
                    AppFontFamily: "HYCuYuanJ"
                },
                txts: [{
                    txt: "",
                    MD5: false,
                    image: ""
                }],
                QuestionsJSON: {
                    version: "0.0.1",
                    questions: []
                },
                Papers: [],
                Daliys: []
            }
        };
    },
    // 组件
    components: {
        "app-top-nav": AppTopNav,
        "app-bottom-nav": AppBottomNav,
    },
    router: AppRouters
})
