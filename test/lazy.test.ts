import { describe, expect, it } from 'bun:test'
import { LazyMemoirist } from '../src/lazy'

describe('LazyMemoirist', () => {
	it('builds deferred routes on first find', () => {
		const router = new LazyMemoirist<string>()

		router.add('GET', '/', 'root')
		router.add('GET', '/users/:id', 'user')
		router.add('GET', '/static/*', 'static')

		expect(Object.keys(router.root)).toEqual([])
		expect(router.find('GET', '/users/1')).toEqual({
			store: 'user',
			params: { id: '1' }
		})
		expect(router.find('GET', '/')?.store).toBe('root')
		expect(router.find('GET', '/static/app.js')?.params).toEqual({
			'*': 'app.js'
		})
		expect(router.deferred).toEqual([])
	})

	it('accepts routes after building and prefers the last duplicate', () => {
		const router = new LazyMemoirist<string>()

		router.add('GET', '/route/:first', 'first')
		router.build()
		router.build()
		router.add('GET', '/route/:last', 'last')

		expect(router.find('GET', '/route/value')).toEqual({
			store: 'last',
			params: { last: 'value' }
		})
	})

	it('builds optional routes', () => {
		const router = new LazyMemoirist<string>()

		router.add('GET', '/api/:first?/:second?', 'optional')

		expect(router.find('GET', '/api/value')).toEqual({
			store: 'optional',
			params: { first: 'value' }
		})
	})

	it('forwards router options', () => {
		const router = new LazyMemoirist<string>({
			loosePath: true,
			onParam: decodeURIComponent
		})

		router.add('GET', '/users/:name', 'user')

		expect(router.find('GET', '/users/salty%20aom/')?.params).toEqual({
			name: 'salty aom'
		})
	})
})
