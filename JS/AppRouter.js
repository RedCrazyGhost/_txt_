const AppRouters = new VueRouter({
    routes: [{
            name: "Home",
            path: '/Home',
            component: {
                props:['data'],
                components: {
                    'app-show': AppShow,
                    'app-service': AppService,
                },
                template: `
                <div>
                
                <app-show :data="data"></app-show>
                
                <app-service :data="data"></app-service>
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
    document.title ='_txt_ '+to.name
})