import { createRouter } from 'radix3'
import { title, now, print, operations } from '../utils'

const router = createRouter()

title('Radix3 benchmark')

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

function noop() {}
var i = 0
var time = 0

routes.forEach((route) => {
    router.insert(route.url, {
        [route.method]: noop
    })
})

time = now()
for (i = 0; i < operations; i++) {
    router.lookup('/user')?.['GET']
}
print('short static:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.lookup('/user/comments')?.['GET']
}
print('static with same radix:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.lookup('/user/lookup/username/john')?.['GET']
}
print('dynamic route:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.lookup('/event/abcd1234/comments')?.['GET']
}
print('mixed static dynamic:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.lookup('/very/deeply/nested/route/hello/there')?.['GET']
}
print('long static:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.lookup('/static/index.html')?.['GET']
}
print('wildcard:', time)
