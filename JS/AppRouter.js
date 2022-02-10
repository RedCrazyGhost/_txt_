const AppRouters = new VueRouter({
    routes: [{
            name: "Home",
            path: '/Home',
            component: {
                props:['data'],
                components: {
                    'app-home':AppHome
                },
                template: `
                <div>
                <app-home :data="data"></app-home>
                </div>
                `
            },
            // 元信息
            meta: {}
        },
        {
            name: "Card",
            path: '/Card',
            component: {
                props:['data'],
                components: {
                    'app-card':AppCard
                },
                template: `
                <div>
                <app-card :data="data"></app-card>
                </div>
                `
            },
            // 元信息
            meta: {}
        },
        {
            name: "About",
            path: '/About',
            component: {
                props: ['data'],
                components: {

                    "app-about": AppAbout
                },
                template: `
                <div>
                  <app-about :data="data"></app-about>
                </div>
                `,
            },
            meta: {

            }
        },
        {
            name: "Daily",
            path: '/Daily',
            component: {
                props: ['data'],
                components: {

                    "app-daily": AppDaily
                },
                template: `
                <div>
                  <app-daily :data="data"></app-daily>
                </div>
                `,
            },
            meta: {

            }
        },
        {
            path: '*',
            redirect: '/Home'
        }
    ]
})
AppRouters.afterEach((to) => {
    if (to.name=="Home") {
        suffixtext="是一个帮助人们进行知识巩固的网站"
    }else{
        suffixtext=to.name
    }
    document.title ='_txt_ '+suffixtext
})