// import { Router } from 'itty-router'
// import { title, now, print, operations } from '../utils'

// const router = Router()

// title('itty-router')

// const routes = [
//     { method: 'GET', url: '/user' },
//     { method: 'GET', url: '/user/comments' },
//     { method: 'GET', url: '/user/avatar' },
//     { method: 'GET', url: '/user/lookup/username/:username' },
//     { method: 'GET', url: '/user/lookup/email/:address' },
//     { method: 'GET', url: '/event/:id' },
//     { method: 'GET', url: '/event/:id/comments' },
//     { method: 'POST', url: '/event/:id/comment' },
//     { method: 'GET', url: '/map/:location/events' },
//     { method: 'GET', url: '/status' },
//     { method: 'GET', url: '/very/deeply/nested/route/hello/there' },
//     { method: 'GET', url: '/static/*a' }
// ]

// function noop() {}
// var i = 0
// var time = 0

// routes.forEach((route) => {
//     // @ts-ignore
//     router[route.method](route.url, noop)
// })

// time = now()
// let route = { method: 'GET', url: '/user' }
// for (i = 0; i < operations; i++) {
//     router.handle(route)
// }
// print('short static:', time)

// time = now()
// route = { method: 'GET', url: '/user/comments' }
// for (i = 0; i < operations; i++) {
//     router.handle(route)
// }
// print('static with same radix:', time)

// time = now()
// route = { method: 'GET', url: '/user/lookup/username/john' }
// for (i = 0; i < operations; i++) {
//     router.handle(route)
// }
// print('dynamic route:', time)

// time = now()
// route = { method: 'GET', url: '/event/abcd1234/comments' }
// for (i = 0; i < operations; i++) {
//     router.handle(route)
// }
// print('mixed static dynamic:', time)

// time = now()
// route = {
//     method: 'GET',
//     url: '/very/deeply/nested/route/hello/there'
// }
// for (i = 0; i < operations; i++) {
//     router.handle(route)
// }
// print('long static:', time)

// time = now()
// route = { method: 'GET', url: '/static/index.html' }
// for (i = 0; i < operations; i++) {
//     router.handle(route)
// }
// print('wildcard:', time)
