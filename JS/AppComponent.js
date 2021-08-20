var AppName = {
    template: `
    <span>
    _<span style="color: var(--bs-green);">t</span>x<span style="color: var(--bs-red);">t</span>_
    </span>
    `,
}
var AppShow = {
    props: ['data'],
    components: {
        'app-name': AppName
    },
    template: `
    <div :class="'container-fluid bg-'+data.WebSiteConfig.AppColor+' text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)">
            <div class="row">
                <div class="col-8 offset-2 text-center">
                    <h1>What is <app-name></app-name> ？
                    </h1>
                    <h2> <app-name></app-name>是一个帮助人们进行知识巩固的网站</h2>
                </div>
            </div>
        </div>
    `,

}
// 需求不明确（暂不使用）
var AppBUGShow={
    props: ['data'],
    
    template: `
    <div :class="'container-fluid bg-'+data.WebSiteConfig.AppColor+' text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)">
    <div class="row">
        <div class="offset-1 col-10 text-danger text-center">
        <p class="fs-3">抓虫！</p>
        <div class="table-responsive">
        <table class="table">
        <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">BUG</th>
          <th scope="col">解决</th>
          <th scope="col">备注</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">1</th>
          <td>Mark</td>
          <td>Otto</td>
          <td>@mdo</td>
        </tr>
        <tr>
          <th scope="row">2</th>
          <td>Jacob</td>
          <td>Thornton</td>
          <td>@fat</td>
        </tr>
        <tr>
          <th scope="row">3</th>
          <td>Larry</td>
          <td>the Bird</td>
          <td>@twitter</td>
        </tr>
      </tbody>
        </table>
        </div>
    </div>
    </div>
    `,
}

var AppAuthorShow = {
    props: ["data"],
    data(){
        return {
            QRcodeCollapse:null
        }
    },
    components: {
        'app-name': AppName
    },
    template: ` 
    <div :class="'container-fluid bg-'+data.WebSiteConfig.AppColor+' text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)">
    <div class="row text-center">
            <div class="col-12">
                <p class="fs-1"><app-name></app-name> Author
                </p>
            </div>
            <div class="col-6 offset-3">
                <img :src="data.WebSiteConfig.AppAuthor.src" class="rounded" alt="头像" height=75px width=75px>
                
            </div>
            <div class="col-12">
                <p class="fs-3 fst-italic">{{data.WebSiteConfig.AppAuthor.name}}</p>
            </div>
            <div class="col-8 offset-2 fs-4">
                <p>如果你觉得这个开源的帮助学习的网站还不错的话</p>
                <p>可以在<a :class="'link-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)" href="https://github.com/RedCrazyGhost/_txt_"><i class="fa fa-github fa-2x"></i></a>给这个开源项目一个<i class="far fa-star fa-2x text-warning"></i></p>
                <p>还可以请作者喝一杯<span class="fa-stack fa-1x"><i class="fa fa-coffee fa-stack-2x text-danger"></i><i class="fa fa-lemon fa-stack-1x text-warning"></i></span></p>
                <p><i  class="far fa-hand-point-right fa-2x "></i> <i @click="QRcode" data-bs-toggle="collapse"class="fab fa-alipay fa-2x text-primary"></i> <i class="far fa-hand-point-left  fa-2x"></i></p>
                <div class="row collapse" id="QRcodeCollapse">
                <div class="col">
                 <img class="img-fluid"  src="IMAG/alipay.jpeg" >
                 </div>
                </div>
               
            </div>
        </div>
    </div>
    `,
    // 注入Collapse
    mounted(){
        this.QRcodeCollapse = new bootstrap.Collapse(document.getElementById('QRcodeCollapse'), {
            toggle: false
          })
    },
    methods:{
        // 显示/隐藏二维码
        QRcode(){ 
           if(this.QRcodeCollapse._element.className.indexOf("show")!=-1){
            this.QRcodeCollapse.hide()
           }else{
            this.QRcodeCollapse.show()
           }
        }
    }
}
var AppTopNav = {
    props: ['data'],
    components: {
        'app-name': AppName
    },
    template: `
    <nav :class="'navbar navbar-expand-lg navbar-'+data.WebSiteConfig.AppColor+' bg-'+data.WebSiteConfig.AppColor">
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
        'app-name': AppName
    },
    template: `
    <nav :class="'navbar navbar-'+data.WebSiteConfig.AppColor+' bg-'+data.WebSiteConfig.AppColor">
            <div class="container">
                <span class="navbar-text">2021 © {{data.WebSiteConfig.AppAuthor.name}}.</span>
                <a class="nav-link navbar-text" href="http://beian.miit.gov.cn/">鄂ICP备19031343号-1</a>
                <span class="navbar-text">Web Site Version:{{data.WebSiteConfig.AppVersion}}</span>
            </div>
        </nav>
    `
}

var AppStep1 = {
    props: ["data"],
    template: `
    <div class="accordion-item" style="border-bottom-width: 0px;">
        <h2 class="accordion-header" id="Step1">
                                <button :class="'accordion-button accordion-button-'+data.WebSiteConfig.AppColor+' collapsed fs-3 bg-'+data.WebSiteConfig.AppColor+' text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)" type="button" data-bs-toggle="collapse"
                                    data-bs-target="#Step-1" aria-expanded="false"
                                    aria-controls="Step-1">
                                    Step 1
                                </button>
                            </h2>
                            <div id="Step-1" :class="'accordion-collapse collapse show bg-'+data.WebSiteConfig.AppColor"
                                aria-labelledby="Step1" data-bs-parent="#accordionFlushExample">
                                <div class="accordion-body" >
                                    <div class="d-flex justify-content-between">
                                        <div :class="'text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)">
                                            <p>题目示例:<span style="color: var(--bs-gray);">1+1=_2_</span> </p>
                                        </div>
                                        <div v-if="data.txts.length==0"><button type="button" class="btn btn-primary"
                                                @click="add_txt_()"><i class="fas fa-plus"></i> 添加题目</button></div>
                                        </div>
                                    <div class="row row-col-1">
                                        <div class="col-12" v-for="(value,index) in data.txts" :key="'txts-'+index" style="margin-bottom: 4rem;">
                                        <div class="row" v-if="value.image!=''">
                                            
                                            <img class="img-fluid" :src="value.image" :alt="'imag-'+index"/>
                                        </div>                                           
                                            <div class="form-floating">
                                                
                                                <textarea class="form-control shadow-sm  rounded" placeholder="_txt_" id="Step-1-textarea"
                                                :style="'padding-right:2rem;overflow-y:hidden;padding-left:2.5rem;resize:none;min-height:'+BoxMinHeight(value.txt)+'rem;background-color:'+ MD5ChangeColor(value)+';'"
                                                v-model=value.txt
                                                >
                                                </textarea>
                                    
                                                <label for="Step-1-textarea">题目 {{index+1}}
                                                <ul class="text-center" style="position: absolute;right:2.5rem">
                                                    <ol v-if="value.txt!=''" v-for="number in txtCharNumber(value.txt)"
                                                    style="list-style:none;color:var(--bs-gray);font-size: 1.15rem;margin-bottom:1.25px">
                                                        {{number}}
                                                    </ol>
                                                </ul>
                                                </label>
                                                <button  class="btn btn-warning position-absolute top-0 start-100 translate-middle" @click="changeMD5(index)" ><i :class=txtObjectMD5ShowIClass(index)></i></button>
                                                <div style="z-index:1;" class="btn-group position-absolute top-100 start-100 translate-middle" role="group" aria-label="Basic example">
                                                    <button type="button" class="btn btn-warning" @click="triggerInputFile('imageFile-'+index)"><i class="fa fa-camera" ></i><input style="display:none;"  @change="getImageFile($event,index)" :id="'imageFile-'+index" accept="image/*" type="file"></button>
                                                    <button v-if="value.image!=''" type="button" class="btn btn-danger" @click="deleteImage(index)"><i class="fa fa-trash-alt" ></i></button>
                                                </div>
                                                <div class="position-absolute d-flex justify-content-evenly w-100"
                                                    :style="'top:'+(BoxMinHeight(value.txt)-1)+'rem;'">
                                                    <div>
                                                        <button type="button" class="btn btn-primary"
                                                            @click="add_txt_()"><i class="fas fa-plus"></i></button>
                                                    </div>
                                                    <div>
                                                        <button type="button" class="btn btn-danger"
                                                            @click="delete_txt_(index)"><i class="fas fa-minus"></i></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button type="button" class="btn btn-primary"
                                        @click="_txt_ToQuestionsJSON()"><i class="fas fa-file-signature fa-1x"></i> 生成JSON</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
    `,
    methods: {
        // 删除图片
        deleteImage(index){
            this.data.txts[index].image=""
        },
        // 通过id触发input
        triggerInputFile(id){
            document.getElementById(id).click()
        },
        // imageFile
        getImageFile(f,index) {
            let _this=this
            let reader = new FileReader();
            reader.readAsDataURL(f.target.files[0])
            reader.onload = function (e) {
              _this.data.txts[index].image=this.result
            }
        },
        // 判断MD5改变背景颜色
        MD5ChangeColor(value) {
            if (value.MD5) {
                return "#cecece"
            } else {
                return ""
            }
        },
        
        // 改变MD5Show样式
        txtObjectMD5ShowIClass(index) {
            if (this.data.txts[index].MD5) {
                return "fa fa-lock";
            } else {
                return "fa fa-unlock";
            }
        },
        // 改变MD5
        changeMD5(index) {
            if (this.data.txts[index].MD5) {
                this.data.txts[index].MD5 = false
            } else {
                this.data.txts[index].MD5 = true
            }
        },
        // txt生成JSON
        _txt_ToQuestionsJSON() {

            let _this=this
            let re = /\_.*?\_/g;
            this.data.txts.forEach(txtObject => {
                if (txtObject.txt.length != 0 && this.txtCharNumber(txtObject.txt, '_') % 2 == 0 && txtObject.txt.match(re) != null) {
                    let middleArrary = new Array()
                    txtObject.txt.split('_').forEach((i, index) => {
                        if (index % 2 == 1) {
                            middleArrary.push(i.split(","))
                        }
                    });
                    let middleTexts=txtObject.txt.split('_')
                    let MD5Answer=new Array()
                    let AnswerLength=new Array()
                

                    middleTexts.forEach((text,index)=>{
                        if(index%2==1){
                            AnswerLength.push(_this.answerLength(text))
                        }
                    })

                    if (txtObject.MD5) {

                        middleArrary.forEach(arr => {
                            let middleMD5Answer = new Array()
                            for (let index = 0; index < arr.length; index++) {
                                middleMD5Answer.push(md5(arr[index]))
                            }
                            MD5Answer.push(middleMD5Answer);
                        })
                        
                        for (let index = 0; index < middleTexts.length; index++) {
                            if(index%2==1){
                                middleTexts[index]=MD5Answer[(index-1)/2].toString()
                            }
                            
                        }
                        middleArrary=MD5Answer
                    }

                    
                    

                    this.data.QuestionsJSON.questions.push({
                        texts: middleTexts,
                        answers: middleArrary,
                        answerslength:AnswerLength,
                        results: new Array(middleArrary.length),
                        MD5: txtObject.MD5,
                        image:txtObject.image
                    })

                }
            })
        },
        // 添加题目
        add_txt_() {
            this.data.txts.push({
                MD5: false,
                txt: "",
                image:""
            })
        },
        // 删除题目
        delete_txt_(index) {
            this.data.txts.splice(index, 1)
        },
        // txt中char的数量 默认情况查询"\n"的情况
        txtCharNumber(txt, char) {
            if (char == null) {
                number = 1;
                Array.from(txt).forEach(tchar => {
                    if (tchar == "\n") {
                        number++;
                    }
                })
            } else {
                number = 0;
                Array.from(txt).forEach(tchar => {
                    if (tchar == char) {
                        number++;
                    }
                })
            }
            return number
        },
        // 根据换行 调整输入框的长度 rem 单位
        BoxMinHeight(txt) {
            let number = 2.5 + this.txtCharNumber(txt) * 1.5
            return number;
        },
        // input框答案长度
        answerLength(text) {
            let length = 0
            text.split("").forEach(i => {
                    if (new RegExp("[\u4E00-\u9FA5]").test(i)) {
                        length += 17
                    }
                    if (new RegExp("[a-z]").test(i)) {
                        length += 11
                    }
                    if (new RegExp("[A-Z]").test(i)) {
                        length += 12
                    }
                    if (new RegExp("[0-9]").test(i)) {
                        length += 11
                    }
                    if (new RegExp("[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]").test(i)) {
                        length += 13
                    }
                    if (new RegExp("[\u0021-\u002f|\u003a-\u0040|\u005b-\u0060|\u007b-\u007e]").test(i)) {
                        length += 7
                    }
                })
            return length+4;
        },
    }
}

var AppStep2 = {
    props: ["data"],
    template: `
    <div class="accordion-item" style="border-bottom-width: 0px;">
                        <h2 class="accordion-header" id="Step2">

                            <button :class="'accordion-button accordion-button-'+data.WebSiteConfig.AppColor+' collapsed fs-3 bg-'+data.WebSiteConfig.AppColor+' text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)" type="button" data-bs-toggle="collapse"
                                data-bs-target="#Step-2" aria-expanded="false"
                                aria-controls="Step-2" >
                                Step 2
                            </button>
                        </h2>
                        <div id="Step-2" :class="'accordion-collapse collapse show bg-'+data.WebSiteConfig.AppColor"
                            aria-labelledby="Step2" data-bs-parent="#accordionFlushExample">
                            <div class="accordion-body" >
                                <p :class="'text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)">
                                Step 1 生成的JSON内容会显示在这里，也可以直接加载以往生成的JSON文件</p>
                                <div class="row">
                                    <div class="d-flex">
                                        <input class="form-control" type="file" accept=".json,application/json"
                                            @change="getFile" multiple />
                                        <button style="white-space:nowrap" class="btn btn-primary"
                                            @click="saveFile"><i class="fas fa-download"></i> 保存文件</button>
                                    </div>
                                </div>
                                <div class="row" style="margin-top: 12px;">
                                    <div class="col-12">
                                        <div class="form-floating ">
                                            <textarea class="form-control shadow-sm bg-body rounded"
                                                placeholder="_json_" id="json" style="min-height: 50em;resize:none;"
                                                :value="QuestionsJSONShow()" readonly> </textarea>
                                            <label for="json">JSON 内容</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
    `,
    methods: {
        // 由于图片二进制渲染会导致页面崩溃
        QuestionsJSONShow(){
            let arr=new Array()
            this.data.QuestionsJSON.questions.forEach(q=>{
                if(q.image!=''){
                    arr.push({
                        texts: q.texts,
                        answers: q.answers,
                        answerslength:q.answerslength,
                        results: q.results,
                        MD5: q.MD5,
                        image:"因数据过大，不予显示"
                    })
                }else{
                    arr.push(q)
                }
            })
            let json=Object.assign({version:this.data.QuestionsJSON.version},{questions:arr})

            return JSON.stringify(json)
        },
        
        // 加载JSON文件
        getFile(f) {
            let _this = this
            for (let index = 0; index < f.target.files.length; index++) {
                let reader = new FileReader();
                reader.readAsText(f.target.files[index])
                reader.onload = function (e) {
                    (Object.values(JSON.parse(this.result).questions)).forEach(i => {
                        _this.data.QuestionsJSON.questions.push(i);
                    })
                };
            }
        },
        // 保存JSON文件
        saveFile() {
            
            let time=new Date()
            var filename = prompt("请编辑文件名称：", getTimeYYYYMM(time)+"-名称-学科-编者.json");
            this.data.QuestionsJSON.CreateTime=getTime(time)
            var string = JSON.stringify(this.data.QuestionsJSON);
            var blob = new Blob([string], {
                type: "text/json;charset=utf-8"
            });

            if (filename != null && filename.endsWith(".json")) {
                saveAs(blob, filename);
            }

        },
    }
}

var AppStep3 = {
    props: ["data"],
    template: `
                    <div class="accordion-item" style="border-bottom-width: 0px;">
                        <h2 class="accordion-header" id="Step">
                            <button :class="'accordion-button accordion-button-'+data.WebSiteConfig.AppColor+' collapsed fs-3 bg-'+data.WebSiteConfig.AppColor+' text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)" type="button" data-bs-toggle="collapse"
                                data-bs-target="#Step-3" aria-expanded="false"
                                aria-controls="Step-3" >
                                Step 3
                            </button>
                        </h2>
                        <div id="Step-3" :class="'accordion-collapse collapse show bg-'+data.WebSiteConfig.AppColor"
                            aria-labelledby="Step3" data-bs-parent="#accordionFlushExample">
                            <div class="accordion-body" >
                             <div v-if="data.QuestionsJSON.questions.length===0" :class="'text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)"">
                                    目前没有题目哦！～ 请从前两步生成题目！
                                    </div>
                                    
                                <div v-else>
                                <div :class="'d-flex bd-highlight text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)">
                                    <div class="me-auto bd-highlight p-2">题目进度</div>
                                    <div class="bd-highlight p-2">{{TrueAnswerNumber()}}/{{AllAnswerNumber()}}</div>
                                    
                                </div>
                                <div   class="progress" style="margin-bottom:2rem">
                                    <div class="progress-bar bg-success progress-bar-striped progress-bar-animated"
                                        role="progressbar"
                                        :style="'width: '+numberToPercent(TrueAnswerNumber(),AllAnswerNumber())+'%'"
                                        :aria-valuenow="TrueAnswerNumber()" aria-valuemin="0"
                                        :aria-valuemax="AllAnswerNumber()"></div>
                                    <div class="progress-bar bg-danger " role="progressbar"
                                        :style="'width: '+numberToPercent(AllAnswerNumber()-TrueAnswerNumber(),AllAnswerNumber())+'%'"
                                        :aria-valuenow="AllAnswerNumber()-TrueAnswerNumber()" aria-valuemin="0"
                                        :aria-valuemax="AllAnswerNumber()"></div>
                                </div>
                                <div class="card h-100 shadow-sm bg-body rounded" v-for="(question,qindex) in data.QuestionsJSON.questions" :key="'question-'+qindex"
                                style="margin-bottom:3rem"> 
                                <div class="card-header">
                                    题目 {{qindex+1}}
                                </div>
                                    <img v-if="question.image!=''" :src="question.image" class="card-img-top" alt="'question-image-'+qindex">
                                        <i :class="'position-absolute top-0 start-100 translate-middle '+judgeAnswerTrueIClass(question)" ></i>
                                       
                                    <div class="card-body" id="question">
                                            <span @click="answerShow(question)" class="fa-stack fa-lg position-absolute top-100 start-100 translate-middle" v-if="!question.MD5" >
                                            <i :class="'fa fa-camera fa-stack-1x text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)"></i>
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
                    </div>
                </div>
                </div>
    `,
    methods: {
        test(){
            console.log(1);
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
                if(question.MD5){
                    if (md5(question.results[index])== answer) {
                            isTrue = true
                        }
                }else{
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
        // 答案展示（长按功能修改）！！！
        answerShow(question) {
            let oldvalue = new Array(question.results.length)
            question.results = question.answers
            setTimeout(() => {
                question.results = oldvalue
            }, 2000);
        }
    }
}

var AppService = {
    props: ["data"],
    components: {
        'app-step-1': AppStep1,
        'app-step-2': AppStep2,
        'app-step-3': AppStep3,
    },
    template: `
    <div class="container-fluid">
        <div :class="'row bg-'+data.WebSiteConfig.AppColor" >
            <div class="col-10 offset-1">
                <div class="accordion accordion-flush" id="accordionFlushExample">
                    <app-step-1 :data="data"></app-step-1>
                    <app-step-2 :data="data"></app-step-2>
                    <app-step-3 :data="data"></app-step-3>
                </div>
            </div>
        </div>
    </div>
    `
}