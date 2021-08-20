window.addEventListener('beforeunload', function (event) {
    event.preventDefault();
    event.returnValue = "1";
});
Vue.mixin({
    methods: {
        // 判断主题颜色对字体进行颜色修改
        judgeColorChangeFontColor(color) {
            switch (color) {
                case "light":
                    return "dark";
                case "dark":
                    return "light";
            }
        },
    },
})

var app = new Vue({
    el: '#App',
    data() {
        return {
            data: {
                WebSiteConfig: {
                    AppRouters: [{
                            to: "/home",
                            name: "home",
                            class: "active"
                        },
                        {
                            to: "/about",
                            name: "about",
                            class: ""
                        },
                        // 需求不明确（暂不使用）
                        // {to:"/bug",name:"bug",class:""}
                    ],
                    AppAuthor: {
                        name: "RedCrazyGhost",
                        src: "IMAG/Author.jpeg",
                    },
                    AppVersion: "1.0.1",
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
                }
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
