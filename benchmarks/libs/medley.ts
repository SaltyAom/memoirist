import { title, now, print, operations } from '../utils'

const Router = require('@medley/router')

const router = new Router()

title('@medley/router')

const routes = [
    { method: 'GET', url: '/user' },
    { method: 'GET', url: '/user/comments' },
    { method: 'GET', url: '/user/avatar' },
    { method: 'GET', url: '/user/lookup/username/:username' },
    { method: 'GET', url: '/user/lookup/email/:address' },
    { method: 'GET', url: '/event/:id' },
    { method: 'GET', url: '/event/:id/comments' },
    { method: 'POST', url: '/event/:id/comment' },
    { method: 'GET', url: '/map/:location/events' },
    { method: 'GET', url: '/status' },
    { method: 'GET', url: '/very/deeply/nested/route/hello/there' },
    { method: 'GET', url: '/static/*' }
]

function addRoute(method: string, path: string, handler: any) {
    const store = router.register(path)
    store[method] = handler
}

function noop() {}
var i = 0
var time = 0

routes.forEach((route) => {
    addRoute(route.method, route.url, noop)
})

time = now()
for (i = 0; i < operations; i++) {
    router.find('/user').store['GET']
}
print('short static:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('/user/comments').store['GET']
}
print('static with same radix:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('/user/lookup/username/john').store['GET']
}
print('dynamic route:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('/event/abcd1234/comments').store['GET']
}
print('mixed static dynamic:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('/very/deeply/nested/route/hello/there').store['GET']
}
print('long static:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('/static/index.html').store['GET']
}
print('wildcard:', time)
