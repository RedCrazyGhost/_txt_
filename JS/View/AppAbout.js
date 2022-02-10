var AppAbout = {
    props: ["data"],
    data() {
        return {
            QRcodeCollapse: null
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
                <p><a style="text-decoration: none" class="link-primary" href="https://jq.qq.com/?_wv=1027&k=arkE99fw"><i class="fab fa-qq fa-2x"></i>群:921970725</a></p>
                <p><i  class="far fa-hand-point-right fa-2x "></i> <i @click="QRcode" data-bs-toggle="collapse"class="fab fa-alipay fa-2x text-primary"></i> <i class="far fa-hand-point-left  fa-2x"></i></p>
                <div class="row collapse" id="QRcodeCollapse">
                <div class="col">
                 <img class="img-fluid"  src="IMAG/alipay.jpeg" >
                 </div>
                </div>
                <div class="row text-center" style="color:var(--bs-gray)">
                    <div class="col-12">
                        <p class="fs-1">赞助</p>
                    </div>
                </div>
                <div style="color:var(--bs-gray)" class="row text-center row-cols-3 row-cols-sm-5 row-cols-lg-7 row-cols-xl-9 row-cols-xxl-11">
                    <div class="col " v-for="person in data.WebSiteConfig.AppCoinPerson">
                        <img v-if="person.src!=''" :src="person.src" class="img-fluid rounded-circle" alt="头像">
                        <i v-else :class="'far fa-2x fa-'+iclass(person.iclass)"></i>
                        <p>{{person.name}}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    // 注入Collapse
    mounted() {
        this.QRcodeCollapse = new bootstrap.Collapse(document.getElementById('QRcodeCollapse'), {
            toggle: false
        })
    },
    methods: {
        // 判断Emoji
        iclass(o){
            let length=this.data.WebSiteConfig.AppEmoji.length
            if(o!=''){
                return o
            }else{
                return this.data.WebSiteConfig.AppEmoji[Math.floor(Math.random()*length)]
            }
        },

        // 显示/隐藏二维码
        QRcode() {
            if (this.QRcodeCollapse._element.className.indexOf("show") != -1) {
                this.QRcodeCollapse.hide()
            } else {
                this.QRcodeCollapse.show()
            }
        }
    }
}