import { Memoirist } from '../src'

import { describe, expect, it } from 'bun:test'

const router = new Memoirist()
router.add('GET', '/abc', '/abc')
router.add('GET', '/id/:id/book', 'book')
router.add('GET', '/id/:id/bowl', 'bowl')

router.add('GET', '/', '/')
router.add('GET', '/id/:id', '/id/:id')
router.add('GET', '/id/:id/abc/def', '/id/:id/abc/def')
router.add('GET', '/id/:id/abd/efd', '/id/:id/abd/efd')
router.add('GET', '/id/:id/name/:name', '/id/:id/name/:name')
router.add('GET', '/id/:id/name/a', '/id/:id/name/a')
router.add('GET', '/dynamic/:name/then/static', '/dynamic/:name/then/static')
router.add('GET', '/deep/nested/route', '/deep/nested/route')
router.add('GET', '/rest/*', '/rest/*')

describe('Memoirist', () => {
    it('match root', () => {
        expect(router.find('GET', '/')).toEqual({
            store: '/',
            params: {}
        })
    })

    it('get path parameter', () => {
        expect(router.find('GET', '/id/1')).toEqual({
            store: '/id/:id',
            params: {
                id: '1'
            }
        })
    })

    it('get multiple path parameters', () => {
        expect(router.find('GET', '/id/1/name/name')).toEqual({
            store: '/id/:id/name/:name',
            params: {
                id: '1',
                name: 'name'
            }
        })
    })

    it('get deep static route', () => {
        expect(router.find('GET', '/deep/nested/route')).toEqual({
            store: '/deep/nested/route',
            params: {}
        })
    })

    it('match wildcard', () => {
        expect(router.find('GET', '/rest/a/b/c')).toEqual({
            store: '/rest/*',
            params: {
                '*': 'a/b/c'
            }
        })
    })

    it('handle mixed dynamic and static', () => {
        expect(router.find('GET', '/dynamic/param/then/static')).toEqual({
            store: '/dynamic/:name/then/static',
            params: {
                name: 'param'
            }
        })
    })

    it('handle static path in dynamic', () => {
        expect(router.find('GET', '/id/1/name/a')).toEqual({
            store: '/id/:id/name/a',
            params: {
                id: '1'
            }
        })
    })

    it('handle dynamic as fallback', () => {
        expect(router.find('GET', '/id/1/name/ame')).toEqual({
            store: '/id/:id/name/:name',
            params: {
                id: '1',
                name: 'ame'
            }
        })
    })

    it('wildcard on root path', () => {
        const router = new Memoirist()

        router.add('GET', '/a/b', 'ok')
        router.add('GET', '/*', 'all')

        expect(router.find('GET', '/a/b/c/d')).toEqual({
            store: 'all',
            params: {
                '*': 'a/b/c/d'
            }
        })

        expect(router.find('GET', '/')).toEqual({
            store: 'all',
            params: {
                '*': ''
            }
        })
    })

    it('can overwrite wildcard', () => {
        const router = new Memoirist()

        router.add('GET', '/', 'ok')
        router.add('GET', '/*', 'all')

        expect(router.find('GET', '/a/b/c/d')).toEqual({
            store: 'all',
            params: {
                '*': 'a/b/c/d'
            }
        })

        expect(router.find('GET', '/')).toEqual({
            store: 'ok',
            params: {}
        })
    })

    it('handle trailing slash', () => {
        const router = new Memoirist()

        router.add('GET', '/abc/def', 'A')
        router.add('GET', '/abc/def/', 'A')

        expect(router.find('GET', '/abc/def')).toEqual({
            store: 'A',
            params: {}
        })

        expect(router.find('GET', '/abc/def/')).toEqual({
            store: 'A',
            params: {}
        })
    })

    it('handle static prefix wildcard', () => {
        const router = new Memoirist()
        router.add('GET', '/a/b', 'ok')
        router.add('GET', '/*', 'all')

        expect(router.find('GET', '/a/b/c/d')).toEqual({
            store: 'all',
            params: {
                '*': 'a/b/c/d'
            }
        })

        expect(router.find('GET', '/')).toEqual({
            store: 'all',
            params: {
                '*': ''
            }
        })
    })

    // ? https://github.com/SaltyAom/raikiri/issues/2
    // Migrate from mei to ei should work
    it('dynamic root', () => {
        const router = new Memoirist()
        router.add('GET', '/', 'root')
        router.add('GET', '/:param', 'it worked')

        expect(router.find('GET', '/')).toEqual({
            store: 'root',
            params: {}
        })

        expect(router.find('GET', '/bruh')).toEqual({
            store: 'it worked',
            params: {
                param: 'bruh'
            }
        })
    })

    it('handle wildcard without static fallback', () => {
        const router = new Memoirist()
        router.add('GET', '/public/*', 'foo')
        router.add('GET', '/public-aliased/*', 'foo')

        expect(router.find('GET', '/public/takodachi.png')?.params['*']).toBe(
            'takodachi.png'
        )
        expect(
            router.find('GET', '/public/takodachi/ina.png')?.params['*']
        ).toBe('takodachi/ina.png')
    })

    it('restore mangled path', () => {
        const router = new Memoirist()

        router.add('GET', '/users/:userId', '/users/:userId')
        router.add('GET', '/game', '/game')
        router.add('GET', '/game/:gameId/state', '/game/:gameId/state')
        router.add('GET', '/game/:gameId', '/game/:gameId')

        expect(router.find('GET', '/game/1/state')?.store).toBe(
            '/game/:gameId/state'
        )
        expect(router.find('GET', '/game/1')?.store).toBe('/game/:gameId')
    })

    it('should be a ble to register param after same prefix', () => {
        const router = new Memoirist()

        router.add('GET', '/api/abc/view/:id', '/api/abc/view/:id')
        router.add('GET', '/api/abc/:type', '/api/abc/:type')

        expect(router.find('GET', '/api/abc/type')).toEqual({
            store: '/api/abc/:type',
            params: {
                type: 'type'
            }
        })

        expect(router.find('GET', '/api/abc/view/1')).toEqual({
            store: '/api/abc/view/:id',
            params: {
                id: '1'
            }
        })
    })

    it('use exact match for part', () => {
        const router = new Memoirist()

        router.add('GET', '/api/search/:term', '/api/search/:term')
        router.add('GET', '/api/abc/view/:id', '/api/abc/view/:id')
        router.add('GET', '/api/abc/:type', '/api/abc/:type')

        expect(router.find('GET', '/api/abc/type')?.store).toBe(
            '/api/abc/:type'
        )
        expect(router.find('GET', '/api/awd/type')).toBe(null)
    })

    it('not error on not found', () => {
        const router = new Memoirist()

        router.add('GET', '/api/abc/:type', '/api/abc/:type')

        expect(router.find('GET', '/api')).toBe(null)
        expect(router.find('POST', '/api/awd/type')).toBe(null)
    })

    it('optional path', () => {
        const router = new Memoirist()

        router.add('GET', '/api/:a?', '/api/a?')

        expect(router.find('GET', '/api')?.store).toBe('/api/a?')
        expect(router.find('GET', '/api/abc')?.store).toBe('/api/a?')
    })

    it('optional path in the middle', () => {
        const router = new Memoirist()

        router.add('GET', '/api/:a?/name', '/api/a?/name')

        expect(router.find('GET', '/api')?.store).toBeUndefined()
        expect(router.find('GET', '/api/name')?.store).toBe('/api/a?/name')
        expect(router.find('GET', '/api/a/name')?.store).toBe('/api/a?/name')
    })

    it('optional path at start', () => {
        const router = new Memoirist()

        router.add('GET', '/:a?/name', '/a?/name')

        expect(router.find('GET', '/a')?.store).toBeUndefined()
        expect(router.find('GET', '/name')?.store).toBe('/a?/name')
        expect(router.find('GET', '/a/name')?.store).toBe('/a?/name')
    })

    it('optional paths 3 level', () => {
        const router = new Memoirist()

        router.add(
            'GET',
            '/api/search/:term?/name/:name?/age/:age?',
            '/api/search/:term?/name/:name?/age/:age?'
        )

        const routes = [
            '/api/search/name/age',
            '/api/search/name/age/:age',
            '/api/search/name/:name/age',
            '/api/search/name/:name/age/:age',
            '/api/search/:term/name/age',
            '/api/search/:term/name/age/:age',
            '/api/search/:term/name/:name/age',
            '/api/search/:term/name/:name/age/:age'
        ]

        routes.forEach((route) => {
            expect(router.find('GET', route)?.store).toBe(
                '/api/search/:term?/name/:name?/age/:age?'
            )
        })
    })

    it('optional chained optional params', () => {
        const router = new Memoirist()

        router.add(
            'GET',
            '/api/search/:term?/:name?/:age?',
            '/api/search/:term?/:name?/:age?'
        )
        
        const routes = [
            '/api/search/term/name/age',
            '/api/search/term/name',
            '/api/search/term'
        ]

        routes.forEach((route) => {
            expect(router.find('GET', route)?.store).toBe(
                '/api/search/:term?/:name?/:age?'
            )
        })
    })
})
