var AppKnowledgeCard = {
    props: ['card'],
    template: `
        <div class="card">
            <div class="card-header">
                {{card.word}} {{card.wordps}}
            </div>
            <div class="card-body">
                {{card.translation}}
            </div>
        </div>
    `,
    methods: {
        
    }
}
var AppCard = {
    props: ['data'],
    created(){
        let _this=this;
        axios.get("https://qcuhrp.api.cloudendpoint.cn/getWords?master=redcrazyghost")
                .then(function (response) {
                    _this.data.words=response.data.words;
                })
                .catch(function (error) {
                    console.log(error);
                });
    },
    components: {
        "app-knowledge-card": AppKnowledgeCard,
        "app-loding":AppLoding
    },
    template: `
    <div :class="'container-fluid bg-'+data.WebSiteConfig.AppColor+' text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)">
        <app-loding v-if="data.words.length===0"></app-loding>
        <div v-else class="row col-10 offset-1" data-masonry="{&quot;percentPosition&quot;: true }">
            <div v-for="i in data.words" class="col-sm-6 col-lg-4 mb-4" >
                <app-knowledge-card :card="i[0]"></app-knowledge-card>
            </div>
        </div>
    </div>
    `
}