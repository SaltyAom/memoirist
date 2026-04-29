/**
 * Tree memory measurement.
 *
 * Goals:
 * 1. Count actual tree nodes (objective, no estimation).
 * 2. Estimate byte cost under the current 7-field Node layout vs the
 *    proposed 5-field "combined Terminal" layout.
 * 3. Compare against a process-level heap delta as a reality check.
 *
 * Byte estimates use JSC-shaped numbers (Bun runs JSC). They are deliberately
 * conservative and meant for relative comparison, not absolute precision.
 *
 *   - Object header:        16 bytes (structure pointer + flags)
 *   - Property slot:         8 bytes
 *   - Array header:         24 bytes (length + storage pointer)
 *   - String header:        16 bytes (length + char pointer)
 *
 * `inert` / Object.create(null) maps and the methods/regex on the class are
 * shared or near-constant overhead, omitted from the estimate.
 */

import { Memoirist } from '../src'
import type { Node, ParamNode } from '../src/type'

const NODE_HEADER = 16
const SLOT = 8
const ARRAY_HEADER = 24
const STRING_HEADER = 16
const NODE_FIELDS_CURRENT = 7 // part, store, storeNames, inert, params, wildcardStore, wildcardStoreNames
const NODE_FIELDS_COMBINED = 5 // part, terminal, inert, params, wildcard
const PARAM_FIELDS_CURRENT = 3 // store, storeNames, inert
const PARAM_FIELDS_COMBINED = 2 // terminal, inert
const TERMINAL_FIELDS = 2 // store + names; wraps both terminal kinds

interface TreeStats {
	nodes: number
	paramNodes: number
	staticTerminals: number // node.store !== null
	wildcardTerminals: number // node.wildcardStore !== null
	paramTerminals: number // ParamNode.store !== null
	totalParamNames: number // sum of all storeNames lengths
	totalPartChars: number // sum of all node.part lengths
	inertEntries: number // total entries across all inert maps
	inertMaps: number // count of non-null inert maps
}

function walkTree<T>(root: Record<string, Node<T>>): TreeStats {
	const s: TreeStats = {
		nodes: 0,
		paramNodes: 0,
		staticTerminals: 0,
		wildcardTerminals: 0,
		paramTerminals: 0,
		totalParamNames: 0,
		totalPartChars: 0,
		inertEntries: 0,
		inertMaps: 0
	}

	function walkNode(n: Node<T>) {
		s.nodes++
		s.totalPartChars += n.part.length

		if (n.store !== null) {
			s.staticTerminals++
			s.totalParamNames += n.storeNames!.length
		}

		if (n.wildcardStore !== null) {
			s.wildcardTerminals++
			s.totalParamNames += n.wildcardStoreNames!.length
		}

		if (n.inert !== null) {
			s.inertMaps++
			for (const key in n.inert) {
				s.inertEntries++
				walkNode(n.inert[key])
			}
		}

		if (n.params !== null) walkParam(n.params)
	}

	function walkParam(p: ParamNode<T>) {
		s.paramNodes++

		if (p.store !== null) {
			s.paramTerminals++
			s.totalParamNames += p.storeNames!.length
		}

		if (p.inert !== null) walkNode(p.inert)
	}

	for (const method in root) walkNode(root[method])

	return s
}

interface ByteEstimate {
	nodes: number
	paramNodes: number
	terminals: number
	storeNamesArrays: number
	partStrings: number
	total: number
}

function estimateCurrent(s: TreeStats): ByteEstimate {
	const nodes = s.nodes * (NODE_HEADER + NODE_FIELDS_CURRENT * SLOT)
	const paramNodes = s.paramNodes * (NODE_HEADER + PARAM_FIELDS_CURRENT * SLOT)
	const terminalCount =
		s.staticTerminals + s.wildcardTerminals + s.paramTerminals
	// Each terminal carries its own storeNames array (or wildcardStoreNames).
	// Empty arrays still allocate the header.
	const storeNamesArrays =
		terminalCount * ARRAY_HEADER + s.totalParamNames * SLOT
	const partStrings = s.nodes * STRING_HEADER + s.totalPartChars * 2
	return {
		nodes,
		paramNodes,
		terminals: 0, // current layout has no separate Terminal objects
		storeNamesArrays,
		partStrings,
		total: nodes + paramNodes + storeNamesArrays + partStrings
	}
}

function estimateCombined(s: TreeStats): ByteEstimate {
	const nodes = s.nodes * (NODE_HEADER + NODE_FIELDS_COMBINED * SLOT)
	const paramNodes =
		s.paramNodes * (NODE_HEADER + PARAM_FIELDS_COMBINED * SLOT)
	const terminalCount =
		s.staticTerminals + s.wildcardTerminals + s.paramTerminals
	// Each terminal becomes a small Terminal object: { store, names }.
	const terminals = terminalCount * (NODE_HEADER + TERMINAL_FIELDS * SLOT)
	// storeNames arrays still exist, just hung off the Terminal instead of the Node.
	const storeNamesArrays =
		terminalCount * ARRAY_HEADER + s.totalParamNames * SLOT
	const partStrings = s.nodes * STRING_HEADER + s.totalPartChars * 2
	return {
		nodes,
		paramNodes,
		terminals,
		storeNamesArrays,
		partStrings,
		total:
			nodes + paramNodes + terminals + storeNamesArrays + partStrings
	}
}

function generateRoutes(count: number): string[] {
	// Roughly mirror real APIs:
	//   60% static, 25% single-param, 10% multi-param, 5% wildcard.
	const verbs = [
		'users',
		'posts',
		'comments',
		'likes',
		'follows',
		'messages',
		'notifications',
		'tags',
		'feeds',
		'sessions',
		'tokens',
		'devices',
		'channels',
		'threads',
		'replies',
		'reactions',
		'mentions',
		'invites',
		'teams',
		'projects',
		'tasks',
		'milestones',
		'labels',
		'attachments',
		'webhooks',
		'integrations',
		'audit',
		'logs',
		'metrics',
		'settings'
	]
	const sub = ['comments', 'likes', 'shares', 'replies', 'history', 'meta']
	const routes: string[] = []
	let i = 0
	while (routes.length < count) {
		const v = verbs[i % verbs.length]
		const j = Math.floor(i / verbs.length)
		const r = i % 20
		if (r < 12) {
			routes.push(`/api/v${(j % 3) + 1}/${v}-${j}`) // static
		} else if (r < 17) {
			routes.push(`/api/v${(j % 3) + 1}/${v}-${j}/:id`) // single-param
		} else if (r < 19) {
			const s = sub[j % sub.length]
			routes.push(`/api/v${(j % 3) + 1}/${v}-${j}/:id/${s}/:subId`) // multi-param
		} else {
			routes.push(`/static/${v}-${j}/*`) // wildcard
		}
		i++
	}
	return routes
}

function fmtBytes(n: number): string {
	if (n < 1024) return `${n} B`
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
	return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function pct(curr: number, next: number): string {
	const delta = ((next - curr) / curr) * 100
	const sign = delta >= 0 ? '+' : ''
	return `${sign}${delta.toFixed(1)}%`
}

function measureProcess(build: () => unknown) {
	if (typeof Bun !== 'undefined') Bun.gc(true)
	const before = process.memoryUsage().heapUsed
	const out = build()
	if (typeof Bun !== 'undefined') Bun.gc(true)
	const after = process.memoryUsage().heapUsed
	console.log(
		`  process heapUsed delta: ${fmtBytes(after - before)}  (before ${fmtBytes(before)} → after ${fmtBytes(after)})`
	)
	return out
}

function noop() {}

function reportFor(scale: number) {
	console.log(`\n=== ${scale} routes ===`)

	const routes = generateRoutes(scale)
	const router = measureProcess(() => {
		const r = new Memoirist<typeof noop>()
		for (const path of routes) r.add('GET', path, noop)
		return r
	}) as Memoirist<typeof noop>

	const s = walkTree(router.root)

	console.log(
		`\n  counts:`,
		`\n    nodes:               ${s.nodes}`,
		`\n    paramNodes:          ${s.paramNodes}`,
		`\n    static terminals:    ${s.staticTerminals}`,
		`\n    wildcard terminals:  ${s.wildcardTerminals}`,
		`\n    param terminals:     ${s.paramTerminals}`,
		`\n    inert maps:          ${s.inertMaps}  (avg fan-out ${(s.inertEntries / Math.max(1, s.inertMaps)).toFixed(2)})`,
		`\n    total param names:   ${s.totalParamNames}`,
		`\n    total part chars:    ${s.totalPartChars}`
	)

	const cur = estimateCurrent(s)
	const com = estimateCombined(s)

	const fmt = (v: number) => fmtBytes(v).padStart(10)
	console.log(
		`\n  estimates (heuristic):`,
		`\n                       current        combined       delta`,
		`\n    nodes:           ${fmt(cur.nodes)}     ${fmt(com.nodes)}    ${pct(cur.nodes, com.nodes).padStart(7)}`,
		`\n    paramNodes:      ${fmt(cur.paramNodes)}     ${fmt(com.paramNodes)}    ${pct(cur.paramNodes, com.paramNodes).padStart(7)}`,
		`\n    terminals:       ${fmt(cur.terminals)}     ${fmt(com.terminals)}    (new in combined)`,
		`\n    storeNames:      ${fmt(cur.storeNamesArrays)}     ${fmt(com.storeNamesArrays)}    ${pct(cur.storeNamesArrays, com.storeNamesArrays).padStart(7)}`,
		`\n    partStrings:     ${fmt(cur.partStrings)}     ${fmt(com.partStrings)}    ${pct(cur.partStrings, com.partStrings).padStart(7)}`,
		`\n    total:           ${fmt(cur.total)}     ${fmt(com.total)}    ${pct(cur.total, com.total).padStart(7)}`
	)
}

console.log(`# Memoirist tree memory report`)
console.log(`# Bun ${Bun.version}, JSC, ${process.platform}-${process.arch}`)

for (const scale of [100, 500, 1000, 5000]) reportFor(scale)
