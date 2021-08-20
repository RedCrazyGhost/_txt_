const AppRouters = new VueRouter({
    routes: [{
            name: "home",
            path: '/home',
            component: {
                props:['data'],
                components: {
                    'app-show': AppShow,
                    'app-service': AppService,
                    'app-bug-show':AppBUGShow
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
            name: "about",
            path: '/about',
            component: {
                props: ['data'],
                components: {

                    "app-author-show": AppAuthorShow
                },
                template: `
                <div>
                  <app-author-show :data="data"></app-author-show>
                </div>
                `,
            },
            meta: {

            }
        },
        // 需求不明确（暂不使用）
        {
            name: "bug",
            path: '/bug',
            component: {
                props: ['data'],
                components: {

                    "app-bug-show": AppBUGShow
                },
                template: `
                <div>
                  <app-bug-show :data="data"></app-bug-show>
                </div>
                `,
            },
            meta: {

            }
        },
        {
            path: '*',
            redirect: '/home'
        }
    ]
})
AppRouters.afterEach((to, from) => {
    switch (to.name) {
        case "home":
            document.title = '_txt_ home'
            break;
        case "about":
            document.title = '_txt_ about'
            break;
        case "bug":
            document.title = '_txt_ bug'
            break;
        default:
            document.title = '_txt_'
            break;
    }
})