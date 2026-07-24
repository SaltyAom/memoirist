// Cross-version attribution bench. mitata's in-process ordering skews
// cross-implementation comparison badly (a version can look 30% faster purely
// by running first), so run ONE implementation per process and compare runs:
//   bun benchmarks/params.bench.ts current
//   bun benchmarks/params.bench.ts 0.4.0
// The published-dist paths below are local checkouts; only `current` is portable.
import { run, bench, group, summary } from 'mitata'
import { Memoirist } from '../src'

const which = process.argv[2] ?? 'current'

const dists: Record<string, string> = {
	'0.4.0':
		'/Users/saltyaom/Documents/web/demo/elysia-aot/node_modules/memoirist/dist/index.mjs',
	'1.2.0':
		'/Users/saltyaom/Documents/web/elysia/elysia/node_modules/memoirist/dist/index.mjs'
}

const Ctor =
	which === 'current'
		? Memoirist
		: ((await import(dists[which])) as any).Memoirist

function noop() {}

const routes = [
	'/',
	'/api/users',
	'/api/users/:userId',
	'/api/users/:userId/posts/:postId',
	'/api/posts',
	'/health',
	'/auth/login',
	'/static/*'
]

const r = new (Ctor as any)()
for (const path of routes) r.add('GET', path, noop)

summary(() => {
	group(which, () => {
		bench('static', () => r.find('GET', '/api/users'))
		bench('1 param', () => r.find('GET', '/api/users/123'))
		bench('2 param', () => r.find('GET', '/api/users/1/posts/2'))
		bench('wildcard', () => r.find('GET', '/static/css/app.css'))
	})
})

await run()
