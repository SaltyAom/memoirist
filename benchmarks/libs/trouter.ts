import TRouter from 'trouter'
import { title, now, print, operations } from '../utils'

const router = new TRouter()

title('trouter benchmark')

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
    router.add(route.method as any, route.url, noop)
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
