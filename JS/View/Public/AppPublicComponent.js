var AppName = {
    template: `
    <span>
    _<span style="color: var(--bs-green);">t</span>x<span style="color: var(--bs-red);">t</span>_
    </span>
    `,
}
var AppQuestion = {
    props: ["data","appcolor"],
    template: `
    <div>
    <div class="card h-100 shadow-sm bg-body rounded"  v-for="(question,qindex) in data.questions" :key="'question-'+qindex"
                                style="margin-bottom:3rem"> 
                                <div class="card-header">
                                    题目 {{qindex+1}}
                                </div>
                                    <img v-if="question.image!=''" :src="question.image" class="card-img-top" alt="'question-image-'+qindex">
                                        <i :class="'position-absolute top-0 start-100 translate-middle '+judgeAnswerTrueIClass(question)" ></i>
                                       
                                    <div class="card-body" id="question">
                                            <span data-title="Step3" data-intro="点击可显示5秒答案" @click="answerShow(question)" class="fa-stack fa-lg position-absolute top-100 start-100 translate-middle" v-if="!question.MD5" >
                                            <i :class="'fa fa-camera fa-stack-1x text-'+judgeColorChangeFontColor(appcolor)"></i>
                                            <i class="fa fa-ban fa-stack-2x text-danger"></i>
                                            </span>
                                      <p>  <span style="white-space: pre-line;" class="card-text" v-for="(text,tindex) in question.texts" :key="'text-'+qindex+'-'+tindex">
                                                <input :id="'question-'+qindex+'-'+(tindex-1)/2" v-if="tindex%2==1"
                                                    type="text" v-model="question.results[(tindex-1)/2]"
                                                    :style="'padding-right: 1px; padding-left: 2px; overflow:hidden;border-left-width: 0px;border-top-width: 0px;border-right-width: 0px;width:'+question.answerslength[(tindex-1)/2]+'px;color:'+resultColor(question,(tindex-1)/2)+';'"
                                                    />
                                                <span v-if="tindex%2==0">{{text}}</span>
                                            </span>
                                            </p>
                                    </div>
                                    <div class="card-footer">
                                        <small class="text-muted" data-bs-spy="scroll"
                                            data-bs-target="#question" data-bs-offset="0" tabindex="0">
                                            <a :href="'#question-'+qindex+'-'+rindex"
                                                        v-for="(result,rindex) in question.results" :key="'result'+rindex"
                                                        :style="'color:'+resultColor(question,rindex)+';text-decoration:none;'">
                                                        第{{rindex+1}}个：{{judgeAnswerTrue(question,rindex)?"正确":"错误"}}
                                            </a>
                                        </small>
                                    </div>
                                </div>
                            </div>
                            </div>
    `,
}
var AppTopNav = {
    props: ['data'],
    components: {
        'app-name': AppName
    },
    template: `
    <nav :class="'by-4 navbar navbar-expand-lg navbar-'+data.WebSiteConfig.AppColor+' bg-'+data.WebSiteConfig.AppColor">
        <div class="container">
            <router-link class="navbar-brand" to="/home">
                <app-name></app-name>
            </router-link>
            <i :class="changeIClass()" :style="changeIStyle()"  @click="changeAppColor()"></i>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav" style="margin-left: auto;">
                    <li class="nav-item" v-for="(router,index) in data.WebSiteConfig.AppRouters" :key="'router-'+index">
                        <router-link :to=router.to :class="'nav-link '+routerMateChangeClass($route,router.name)" aria-current="page" >{{router.name}}</router-link>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
    `,
    methods: {
        // 根据Router元信息修改class
        routerMateChangeClass(router, name) {
            if (router.name == name) {
                return "active"
            }
        },
        // 改变App主题颜色
        changeAppColor() {
            if (this.data.WebSiteConfig.AppColor == "light") {
                this.data.WebSiteConfig.AppColor = "dark"
            } else {
                this.data.WebSiteConfig.AppColor = "light"
            }
        },
        // 根据AppColor改变class
        changeIClass() {
            switch (this.data.WebSiteConfig.AppColor) {
                case "light":
                    return "far fa-sun fa-spin fa-lg";
                case "dark":
                    return "fas fa-moon fa-lg";
            }
        },
        // 根据AppColor改变style
        changeIStyle() {
            switch (this.data.WebSiteConfig.AppColor) {
                case "light":
                    return "color:var(--bs-warning)";
                case "dark":
                    return "color:var(--bs-primary)";
            }
        }
    }
}


var AppBottomNav = {
    props: ['data'],
    components: {
        'app-name': AppName,
    },
    template: `
    <nav :class="'by-4 navbar navbar-'+data.WebSiteConfig.AppColor+' bg-'+data.WebSiteConfig.AppColor">
            <div class="container">
                <span class="navbar-text">2021-{{this.getTimeYYYY(new Date())}} © {{data.WebSiteConfig.AppAuthor.name}}</span>
                <a class="nav-link navbar-text" href="http://beian.miit.gov.cn/">鄂ICP备19031343号-1</a>
                <a class="nav-link navbar-text" target="_blank" href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=42020202000140"><img src="IMAG/AppGA.png" style="float:left;"/>鄂公网安备 42020202000140号</a>
                <span class="navbar-text">Web Site Version:{{data.WebSiteConfig.AppVersion}}</span>
            </div>
        </nav>
    `
}
