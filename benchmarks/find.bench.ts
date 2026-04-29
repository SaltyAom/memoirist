import { run, bench, group, summary } from 'mitata'
import { Memoirist } from '../src'

function noop() {}

function buildRouter() {
	const r = new Memoirist<typeof noop>()

	const siblings = [
		'/api/users',
		'/api/users/:id',
		'/api/users/:userId/posts/:postId',
		'/api/posts',
		'/api/posts/:id',
		'/api/comments',
		'/api/comments/:id',
		'/api/likes',
		'/api/follows',
		'/api/messages',
		'/api/notifications',
		'/api/search',
		'/api/feed',
		'/api/tags',
		'/api/tags/:tag',
		'/health',
		'/version',
		'/metrics',
		'/ready',
		'/live',
		'/auth/login',
		'/auth/logout',
		'/auth/refresh',
		'/static/*',
		'/assets/*',
		'/public/*',
		'/blog/:slug',
		'/blog/:slug/comments',
		'/docs/:section/:page',
		'/'
	]

	for (const path of siblings) r.add('GET', path, noop)

	return r
}

const router = buildRouter()

summary(() => {
	group('find', () => {
		bench('static', () => router.find('GET', '/api/users'))
		bench('single-param', () => router.find('GET', '/api/users/123'))
		bench('nested-params', () =>
			router.find('GET', '/api/users/123/posts/456')
		)
		bench('wildcard', () => router.find('GET', '/static/css/app.css'))
	})
})

await run()
