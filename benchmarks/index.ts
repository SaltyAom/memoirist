import { bench, group, run } from 'mitata'
import { Memoirist } from '../src'
import Router from 'koa-tree-router'
import { createRouter } from 'radix3'
import { Raikiri } from 'raikiri'
import { Trouter as TRouter } from 'trouter'
// @ts-ignore
import TrekRouter from 'trek-router'
// @ts-ignore
import { RegExpRouter } from '../node_modules/hono/dist/router/reg-exp-router'
// @ts-ignore
import { SmartRouter } from '../node_modules/hono/dist/router/smart-router'
// @ts-ignore
import { TrieRouter } from '../node_modules/hono/dist/router/trie-router'

const ExpressRouter = require('express/lib/router')
const FindMyWay = require('find-my-way')
const MedleyRouter = require('@medley/router')

type Adapter = {
	name: string
	add(method: string, path: string): void
	find(method: string, path: string): unknown
}

const noop = () => {}
const routes = [
	['GET', '/user'],
	['GET', '/user/comments'],
	['GET', '/user/avatar'],
	['GET', '/user/lookup/username/:username'],
	['GET', '/user/lookup/email/:address'],
	['GET', '/event/:id'],
	['GET', '/event/:id/comments'],
	['POST', '/event/:id/comment'],
	['GET', '/map/:location/events'],
	['GET', '/status'],
	['GET', '/very/deeply/nested/route/hello/there'],
	['GET', '/static/*']
] as const

const cases = [
	['short static', '/user'],
	['static with same radix', '/user/comments'],
	['dynamic route', '/user/lookup/username/john'],
	['mixed static dynamic', '/event/abcd1234/comments'],
	['long static', '/very/deeply/nested/route/hello/there'],
	['wildcard', '/static/index.html']
] as const

function adapters(): Adapter[] {
	const memoirist = new Memoirist<typeof noop>()
	const express = ExpressRouter()
	const findMyWay = FindMyWay()
	const honoRegexp = new RegExpRouter()
	const honoSmart = new SmartRouter({
		routers: [new RegExpRouter(), new TrieRouter()]
	})
	const honoTrie = new TrieRouter()
	const koa = new Router()
	const medley = new MedleyRouter()
	const radix = createRouter()
	const raikiri = new Raikiri()
	const trek = new TrekRouter()
	const trouter = new TRouter()

	return [
		{
			name: 'memoirist',
			add: (method, path) => memoirist.add(method, path, noop),
			find: (method, path) => memoirist.find(method, path)
		},
		{
			name: 'express (includes handling)',
			add(method, path) {
				express.route(path)[method === 'GET' ? 'get' : 'post'](noop)
			},
			find: (method, path) =>
				express.handle({ method, url: path }, null, noop)
		},
		{
			name: 'find-my-way',
			add: (method, path) => findMyWay.on(method, path, noop),
			find: (method, path) => findMyWay.find(method, path)
		},
		{
			name: 'hono/regexp-router',
			add: (method, path) =>
				honoRegexp.add(method, `http://localhost:8080${path}`, noop),
			find: (method, path) => honoRegexp.match(method, path)
		},
		{
			name: 'hono/smart-router',
			add: (method, path) => honoSmart.add(method, path, noop),
			find: (method, path) => honoSmart.match(method, path)
		},
		{
			name: 'hono/trie-router',
			add: (method, path) => honoTrie.add(method, path, noop),
			find: (method, path) => honoTrie.match(method, path)
		},
		{
			name: 'koa-tree-router',
			add: (method, path) =>
				koa.on(method, path === '/static/*' ? '/static/*path' : path, noop),
			// @ts-ignore koa-tree-router omits its public find() from its types
			find: (method, path) => koa.find(method, path)
		},
		{
			name: '@medley/router',
			add(method, path) {
				medley.register(path)[method] = noop
			},
			find: (method, path) => medley.find(path).store[method]
		},
		{
			name: 'radix3',
			add: (method, path) => radix.insert(path, { [method]: noop }),
			find: (method, path) => radix.lookup(path)?.[method]
		},
		{
			name: 'raikiri',
			add: (method, path) => raikiri.add(method, path, noop),
			find: (method, path) => raikiri.match(method, path)
		},
		{
			name: 'trek-router',
			add: (method, path) => trek.add(method, path, noop),
			find: (method, path) => trek.find(method, path)
		},
		{
			name: 'trouter',
			add: (method, path) => trouter.add(method as any, path, noop),
			find: (method, path) => trouter.find(method as any, path)
		}
	]
}

for (const router of adapters()) {
	for (const [method, path] of routes) router.add(method, path)

	group(router.name, () => {
		for (const [name, path] of cases)
			bench(name, () => router.find('GET', path))
	})
}

await run()
