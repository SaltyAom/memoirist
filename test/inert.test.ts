import { Memoirist } from '../src'

import { describe, expect, it } from 'bun:test'
import { heapStats } from 'bun:jsc'

// Static children live in a dense array indexed by `charCode - inertMin`. An
// object keyed by char code made JSC size its storage to the largest code, so
// every branching node paid ~1.6 KB for a single lowercase child.
describe('static children', () => {
	it('re-bases when a lower char code arrives later', () => {
		const router = new Memoirist<string>()
		const paths = ['/z', '/m', '/b', '/a']

		// descending char codes force a re-base on every insert
		for (const path of paths) router.add('GET', path, path)

		for (const path of paths)
			expect(router.find('GET', path)).toEqual({
				store: path,
				params: {}
			})

		// below the lowest code, inside a hole, above the highest code
		expect(router.find('GET', '/0')).toBeNull()
		expect(router.find('GET', '/c')).toBeNull()
		expect(router.find('GET', '/~')).toBeNull()
	})

	it('keeps sparse codes apart in one node, through a split', () => {
		const router = new Memoirist<string>()

		// '/pzx' splits 'p/x' into a node with two children, '~x' then lands
		// past the highest code
		router.add('GET', '/p/x', 'slash')
		router.add('GET', '/pzx', 'z')
		router.add('GET', '/p~x', 'tilde')

		expect(router.find('GET', '/p/x')?.store).toBe('slash')
		expect(router.find('GET', '/pzx')?.store).toBe('z')
		expect(router.find('GET', '/p~x')?.store).toBe('tilde')

		// '-' (45) sits below '/' (47): a negative index must miss, not throw
		expect(router.find('GET', '/p-x')).toBeNull()
		// '}' (125) is a hole between 'z' and '~'
		expect(router.find('GET', '/p}x')).toBeNull()
		expect(router.find('GET', '/p')).toBeNull()
	})

	it('resolves static children behind a param', () => {
		const router = new Memoirist<string>()
		router.add('GET', '/user/:id/z', 'z')
		router.add('GET', '/user/:id/a', 'a')
		router.add('GET', '/user/:id/~', 'tilde')

		expect(router.find('GET', '/user/1/a')).toEqual({
			store: 'a',
			params: { id: '1' }
		})
		expect(router.find('GET', '/user/2/z')?.params).toEqual({ id: '2' })
		expect(router.find('GET', '/user/3/~')?.store).toBe('tilde')
		expect(router.find('GET', '/user/4/m')).toBeNull()
	})

	it('keeps a single lowercase static child small', () => {
		const make = () => {
			const router = new Memoirist<number>()
			router.add('GET', '/z', 1)

			return router
		}

		for (let i = 0; i < 100; i++) make()

		const N = 2000
		const routers = new Array(N)

		Bun.gc(true)
		const before = heapStats().heapSize
		for (let i = 0; i < N; i++) routers[i] = make()
		Bun.gc(true)
		const perRouter = (heapStats().heapSize - before) / N

		// ~420 B; keyed by char code it was ~1667 B
		expect(perRouter).toBeLessThan(485)

		expect(routers.length).toBe(N)
	})
})
