// @ts-ignore
import { SmartRouter } from '../../node_modules/hono/dist/router/smart-router'
// @ts-ignore
import { RegExpRouter } from 'hono/dist/router/reg-exp-router'
// @ts-ignore
import { StaticRouter } from 'hono/dist/router/static-router'
// @ts-ignore
import { TrieRouter } from 'hono/dist/router/trie-router'

import { title, now, print, operations } from '../utils'

const router = new SmartRouter({
    routers: [new RegExpRouter(), new StaticRouter(), new TrieRouter()]
})

title('hono/smart-router')

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
