import { title, now, print, operations } from '../utils'
// @ts-ignore
import TrekRouter from 'trek-router'

const router = new TrekRouter()

title('trek-router benchmark')

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
    router.add(route.method, route.url, noop)
})

time = now()
for (i = 0; i < operations; i++) {
    router.find('GET', '/user')
}
print('short static:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('GET', '/user/comments')
}
print('static with same radix:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('GET', '/user/lookup/username/john')
}
print('dynamic route:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('GET', '/event/abcd1234/comments')
}
print('mixed static dynamic:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('GET', '/very/deeply/nested/route/hello/there')
}
print('long static:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.find('GET', '/static/index.html')
}
print('wildcard:', time)

// Uncomment this if correction is need 😭😭💢💢💢
// console.log(router.find('GET', '/user'))
// console.log(router.find('GET', '/user/comments'))
// console.log(router.find('GET', '/user/lookup/username/john'))
// console.log(router.find('GET', '/event/abcd1234/comments'))
// console.log(router.find('GET', '/very/deeply/nested/route/hello/there'))
// console.log(router.find('GET', '/static/index.html'))
