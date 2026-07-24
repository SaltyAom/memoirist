import { Memoirist } from '../src'

import { describe, expect, it } from 'bun:test'

// Params are filled while the match unwinds (deepest param first), so these
// cover the cases where the name/depth pairing could drift: backtracking,
// sibling routes with different param counts, and params before a wildcard.
describe('param unwinding', () => {
	it('pairs names with values across many params', () => {
		const router = new Memoirist<string>()
		router.add('GET', '/:a/:b/:c/:d', 'deep')

		expect(router.find('GET', '/1/2/3/4')!.params).toEqual({
			a: '1',
			b: '2',
			c: '3',
			d: '4'
		})
	})

	it('fills params for a static route behind params', () => {
		const router = new Memoirist<string>()
		router.add('GET', '/blog/:slug/comments', 'comments')

		expect(router.find('GET', '/blog/hello/comments')).toEqual({
			store: 'comments',
			params: { slug: 'hello' }
		})
	})

	it('backtracks from a longer static branch without leaking names', () => {
		const router = new Memoirist<string>()
		router.add('GET', '/a/:x/b/:y', 'long')
		router.add('GET', '/a/:x/c', 'short')

		expect(router.find('GET', '/a/1/c')).toEqual({
			store: 'short',
			params: { x: '1' }
		})
		expect(router.find('GET', '/a/1/b/2')).toEqual({
			store: 'long',
			params: { x: '1', y: '2' }
		})
	})

	it('prefers a static sibling over a param at the same depth', () => {
		const router = new Memoirist<string>()
		router.add('GET', '/user/:id', 'dynamic')
		router.add('GET', '/user/me', 'static')

		expect(router.find('GET', '/user/me')).toEqual({
			store: 'static',
			params: {}
		})
		expect(router.find('GET', '/user/1')).toEqual({
			store: 'dynamic',
			params: { id: '1' }
		})
	})

	it('fills params preceding a wildcard', () => {
		const router = new Memoirist<string>()
		router.add('GET', '/files/:bucket/*', 'files')

		expect(router.find('GET', '/files/photos/a/b.png')).toEqual({
			store: 'files',
			params: { bucket: 'photos', '*': 'a/b.png' }
		})
		expect(router.find('GET', '/files/photos/')).toEqual({
			store: 'files',
			params: { bucket: 'photos', '*': '' }
		})
	})

	it('does not reuse names from a previous find', () => {
		const router = new Memoirist<string>()
		router.add('GET', '/a/:x/:y', 'two')
		router.add('GET', '/b/:z', 'one')

		expect(router.find('GET', '/a/1/2')!.params).toEqual({ x: '1', y: '2' })
		expect(router.find('GET', '/b/3')!.params).toEqual({ z: '3' })
		expect(router.find('GET', '/a/4/5')!.params).toEqual({ x: '4', y: '5' })
	})
})

// Param names come from the developer's route pattern, so a name that collides
// with Object.prototype must still round-trip rather than silently vanish.
describe('prototype-shaped param names', () => {
	const names = ['__proto__', 'constructor', 'hasOwnProperty', 'toString']

	for (const name of names)
		it(`round-trips :${name}`, () => {
			const router = new Memoirist<string>()
			router.add('GET', `/x/:${name}`, 'store')

			const found = router.find('GET', '/x/value')!

			expect(found.store).toBe('store')
			expect(found.params[name]).toBe('value')
		})

	it('round-trips a prototype-shaped name alongside others', () => {
		const router = new Memoirist<string>()
		router.add('GET', '/x/:a/:__proto__/:b', 'store')

		const params = router.find('GET', '/x/1/2/3')!.params

		expect(params.a).toBe('1')
		expect(params['__proto__']).toBe('2')
		expect(params.b).toBe('3')
	})

	// Null prototypes make `for…in` over params ~12x slower on V8, so they are
	// used only where a plain object would drop the write
	it('uses a plain object unless a param is named __proto__', () => {
		const router = new Memoirist<string>()
		router.add('GET', '/x/:id', 'plain')
		router.add('GET', '/y/:__proto__', 'guarded')

		expect(Object.getPrototypeOf(router.find('GET', '/x/1')!.params)).toBe(
			Object.prototype
		)
		expect(Object.getPrototypeOf(router.find('GET', '/y/1')!.params)).toBe(
			null
		)
	})
})
