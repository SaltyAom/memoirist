import { Memoirist } from '../src'

import { describe, expect, it } from 'bun:test'

describe('onParam', () => {
	it('handle single onParam', () => {
		const router = new Memoirist({
			onParam: () => 'kon kon'
		})

		router.add('GET', '/name/:name/id/:id', 'fox')

		expect(router.find('GET', '/name/fubuki/id/123')).toEqual({
			store: 'fox',
			params: {
				name: 'kon kon',
				id: 'kon kon'
			}
		})
	})

	it('handle multiple onParam', () => {
		const router = new Memoirist({
			onParam: [() => 'kon kon', (value) => value + '!']
		})

		router.add('GET', '/name/:name/id/:id', 'fox')

		expect(router.find('GET', '/name/fubuki/id/123')).toEqual({
			store: 'fox',
			params: {
				name: 'kon kon!',
				id: 'kon kon!'
			}
		})
	})

	it('handle continue on undefined', () => {
		const router = new Memoirist({
			onParam: [() => {}, (value) => value + '!']
		})

		router.add('GET', '/name/:name/id/:id', 'fox')

		expect(router.find('GET', '/name/fubuki/id/123')).toEqual({
			store: 'fox',
			params: {
				name: 'fubuki!',
				id: '123!'
			}
		})
	})

	it('handle by key', () => {
		const router = new Memoirist({
			onParam(value, key) {
				if (key === 'name') return 'fbk!'
			}
		})

		router.add('GET', '/name/:name/id/:id', 'fox')

		expect(router.find('GET', '/name/fubuki/id/123')).toEqual({
			store: 'fox',
			params: {
				name: 'fbk!',
				id: '123'
			}
		})
	})
})
