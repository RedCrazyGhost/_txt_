var AppDaily = {
    props: ['data'],
    created(){
        this.getQuestionJSON('QuestionJSON/daliy/'+this.getTimeYYYYMMDD(new Date()),'daliy')
    },
    components:{
        'app-question':AppQuestion
    },
    template: `
    <div :class="'container-fluid bg-'+data.WebSiteConfig.AppColor+' text-'+judgeColorChangeFontColor(data.WebSiteConfig.AppColor)">
        <div class="row text-center" >
            <h2 style="margin-top: 3rem;">每日计划</h2>
            <p>网站作者时不时更新</p>
            <p>咕咕咕～</p>
        </div>
        <div class="row row-cols-3 text-center" >
            <div class="col" v-for="(FileName,findex) in data.Daliys" :key="FileName" v-if="FileName.indexOf(getTimeYYYYMM(new Date())) != -1&&FileName<getTimeYYYYMMDD(new Date())">
             <button class="btn btn-warning" @click="getQuestionJSON('QuestionJSON/daliy/'+FileName,'daliy')"><i class="far fa-file"></i> {{FileName}}</button>
            </div>
        </div>
        <div class="row text-dark" style="margin-top: 2.5rem;">
            <div  class="offset-1 col-10">
                <app-question :appcolor="data.WebSiteConfig.AppColor" :data="data.Daliy"></app-question>
            </div>
        </div>
    </div>
    `
}