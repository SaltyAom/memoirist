// @ts-ignore
import { RegExpRouter } from '../../node_modules/hono/dist/router/reg-exp-router'
import { title, now, print, operations } from '../utils'

const router = new RegExpRouter()

title('hono/reg-exp-router')

const routes = [
    { method: 'GET', url: 'http://localhost:8080/user' },
    { method: 'GET', url: 'http://localhost:8080/user/comments' },
    { method: 'GET', url: 'http://localhost:8080/user/avatar' },
    { method: 'GET', url: 'http://localhost:8080/user/lookup/username/:username' },
    { method: 'GET', url: 'http://localhost:8080/user/lookup/email/:address' },
    { method: 'GET', url: 'http://localhost:8080/event/:id' },
    { method: 'GET', url: 'http://localhost:8080/event/:id/comments' },
    { method: 'POST', url: 'http://localhost:8080/event/:id/comment' },
    { method: 'GET', url: 'http://localhost:8080/map/:location/events' },
    { method: 'GET', url: 'http://localhost:8080/status' },
    { method: 'GET', url: 'http://localhost:8080/very/deeply/nested/route/hello/there' },
    { method: 'GET', url: 'http://localhost:8080/static/*' }
]

function noop() {}
var i = 0
var time = 0

routes.forEach((route) => {
    router.add(route.method, route.url, noop)
})

time = now()
for (i = 0; i < operations; i++) {
    router.match('GET', '/user')
}
print('short static:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.match('GET', '/user/comments')
}
print('static with same radix:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.match('GET', '/user/lookup/username/john')
}
print('dynamic route:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.match('GET', '/event/abcd1234/comments')
}
print('mixed static dynamic:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.match('GET', '/very/deeply/nested/route/hello/there')
}
print('long static:', time)

time = now()
for (i = 0; i < operations; i++) {
    router.match('GET', '/static/index.html')
}
print('wildcard:', time)
