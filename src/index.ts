import type {
	FindResult,
	MemoiristOptions,
	Node,
	ParamNode,
	ProcessParam
} from './type'

export type {
	FindResult,
	MaybeArray,
	MemoiristOptions,
	Node,
	ParamNode,
	ProcessParam
} from './type'

function createNode<T>(part: string, inert?: Node<T>[]): Node<T> {
	const inertMap: Record<number, Node<T>> | null = inert?.length
		? Object.create(null)
		: null

	if (inertMap)
		for (const child of inert!) inertMap[child.part.charCodeAt(0)] = child

	return {
		part,
		store: null,
		nullProto: false,
		paramStore: null,
		storeNames: null,
		inert: inertMap,
		params: null,
		wildcardStore: null,
		wildcardStoreNames: null
	}
}

function cloneNode<T>(node: Node<T>, part: string): Node<T> {
	return {
		...node,
		part
	}
}

function createParamNode<T>(): ParamNode<T> {
	return {
		store: null,
		storeNames: null,
		nullProto: false,
		inert: null
	}
}

function composeOnParam(fns: ProcessParam[]): ProcessParam {
	return function (value, key) {
		let current: unknown = value
		let mutated = false

		for (let i = 0; i < fns.length; i++) {
			const result = fns[i](current as string, key)
			if (result !== undefined) {
				current = result
				mutated = true
			}
		}

		return mutated ? current : undefined
	}
}

/** Wildcard leaf: '*' is the deepest capture, any params above fill while unwinding */
function wildcardLeaf<T>(
	node: Node<T>,
	value: string,
	onParam: ProcessParam | undefined
): FindResult<T> {
	const names = node.wildcardStoreNames!
	if (names.length > 1) {
		matchedNames = names
		matchedIndex = names.length - 2
	}

	return {
		store: node.wildcardStore!,
		params: seedParams('*', value, onParam, node.nullProto)
	}
}

/** `params['__proto__'] = value` is a silent no-op on a plain object */
function needsNullProto(names: string[]) {
	return names.indexOf('__proto__') !== -1
}

function seedParams(
	name: string,
	value: unknown,
	onParam: ProcessParam | undefined,
	nullProto: boolean
) {
	// Plain object unless the route names a param `__proto__`, where the write
	// would be a silent no-op. Null-proto costs nothing on JSC but makes `for…in`
	// over the result ~12x slower on V8, which is what consumers pay
	const params: Record<string, any> = nullProto ? Object.create(null) : {}
	params[name] = onParam ? applyParam(value, name, onParam) : value

	return params
}

const applyParam = (value: unknown, name: string, onParam: ProcessParam) =>
	onParam(value as string, name) ?? value

let matchedNames: string[] = []
let matchedIndex = 0

const pattern = {
	static: /:.+?(?=\/|$)/,
	params: /:.+?(?=\/|$)/g,
	optionalParams: /(\/:\w+\?)/g
} as const

export class Memoirist<T> {
	root: Record<string, Node<T>> = Object.create(null)
	onParam?: ProcessParam
	loosePath = false

	constructor(options?: MemoiristOptions) {
		if (options?.loosePath) this.loosePath = true

		const onParam = options?.onParam
		if (onParam)
			this.onParam = Array.isArray(onParam)
				? onParam.length === 1
					? onParam[0]
					: composeOnParam(onParam)
				: onParam
	}

	add(method: string, path: string, store: T): FindResult<T>['store'] {
		if (!path) path = '/'
		else if (path[0] !== '/') path = `/${path}`

		const isWildcard = path[path.length - 1] === '*'
		// End with ? and is param
		const optionalParams = path.match(pattern.optionalParams)

		if (optionalParams) {
			const segments = path.slice(1).split('/')
			const isOptional = (s: string) =>
				s.length > 1 &&
				s.charCodeAt(0) === 58 /* ':' */ &&
				s.charCodeAt(s.length - 1) === 63 /* '?' */

			let tailStart = segments.length
			while (tailStart > 0 && isOptional(segments[tailStart - 1]))
				tailStart--

			let midIdx = -1
			for (let i = 0; i < tailStart; i++)
				if (isOptional(segments[i])) {
					midIdx = i
					break
				}

			if (midIdx !== -1) {
				const without = segments.slice()
				without.splice(midIdx, 1)
				this.add(method, '/' + without.join('/'), store)

				const kept = segments.slice()
				kept[midIdx] = kept[midIdx].slice(0, -1)
				this.add(method, '/' + kept.join('/'), store)
				return store
			}

			const head = segments.slice(0, tailStart)
			const fullTail = segments
				.slice(tailStart)
				.map((s) => s.slice(0, -1))

			for (let k = 0; k <= fullTail.length; k++) {
				const parts = head.concat(fullTail.slice(0, k))
				const newPath = parts.length === 0 ? '/' : '/' + parts.join('/')
				this.add(method, newPath, store)
			}

			return store
		}

		if (isWildcard)
			// Slice off trailing '*'
			path = path.slice(0, -1)

		const inertParts = path.split(pattern.static)
		const paramParts = path.match(pattern.params) || []

		if (inertParts[inertParts.length - 1] === '') inertParts.pop()

		let node: Node<T>

		if (!this.root[method]) node = this.root[method] = createNode<T>('/')
		else node = this.root[method]

		let paramPartsIndex = 0
		const paramNames: string[] = []

		for (let i = 0; i < inertParts.length; ++i) {
			let part = inertParts[i]

			if (i > 0) {
				// Set param on the node
				const param = paramParts[paramPartsIndex++].slice(1)
				paramNames.push(param)

				if (node.params === null) node.params = createParamNode()

				const params = node.params

				if (params.inert === null) {
					node = params.inert = createNode(part)
					continue
				}

				node = params.inert
			}

			for (let j = 0; ; ) {
				if (j === part.length) {
					if (j < node.part.length) {
						// Move the current node down
						const childNode = cloneNode(node, node.part.slice(j))
						Object.assign(node, createNode(part, [childNode]))
					}
					break
				}

				if (j === node.part.length) {
					// Add static child
					if (node.inert === null) node.inert = Object.create(null)

					const inert = node.inert![part.charCodeAt(j)]

					if (inert) {
						// Re-run loop with existing static node
						node = inert
						part = part.slice(j)
						j = 0
						continue
					}

					// Create new node
					const childNode = createNode<T>(part.slice(j))
					node.inert![part.charCodeAt(j)] = childNode
					node = childNode

					break
				}

				if (part[j] !== node.part[j]) {
					// Split the node
					const existingChild = cloneNode(node, node.part.slice(j))
					const newChild = createNode<T>(part.slice(j))

					Object.assign(
						node,
						createNode(node.part.slice(0, j), [
							existingChild,
							newChild
						])
					)

					node = newChild

					break
				}

				++j
			}
		}

		if (paramPartsIndex < paramParts.length) {
			// The final part is a parameter
			const name = paramParts[paramPartsIndex].slice(1)
			paramNames.push(name)

			if (node.params === null) node.params = createParamNode()

			node.params.store = store
			node.params.storeNames = paramNames
			node.params.nullProto = needsNullProto(paramNames)

			return node.params.store!
		}

		if (isWildcard) {
			// The final part is a wildcard
			paramNames.push('*')

			node.wildcardStore = store
			node.wildcardStoreNames = paramNames
			node.nullProto = needsNullProto(paramNames)

			return node.wildcardStore!
		}

		// The final part is static
		if (paramNames.length === 0) node.store = store
		else {
			node.paramStore = store
			node.storeNames = paramNames
			node.nullProto = needsNullProto(paramNames)
		}

		return store
	}

	find(method: string, url: string): FindResult<T> | null {
		const root = this.root[method]
		if (!root) return null

		const found = matchRoute(url, url.length, root, 0, this.onParam)
		if (found || !this.loosePath || url.length <= 1) return found

		const loose =
			url.charCodeAt(url.length - 1) === 47 ? url.slice(0, -1) : url + '/'

		return matchRoute(loose, loose.length, root, 0, this.onParam)
	}
}

function matchRoute<T>(
	url: string,
	urlLength: number,
	node: Node<T>,
	startIndex: number,
	onParam: ProcessParam | undefined
): FindResult<T> | null {
	const part = node.part
	const length = part.length
	const endIndex = startIndex + length

	if (length > 1) {
		if (endIndex > urlLength) return null

		// Using a loop is faster for short strings
		if (length < 15) {
			for (let i = 1, j = startIndex + 1; i < length; ++i, ++j)
				if (part.charCodeAt(i) !== url.charCodeAt(j)) return null
		} else if (url.slice(startIndex, endIndex) !== part) return null
	}

	// Reached the end of the URL
	if (endIndex === urlLength) {
		// No params can be written into this one, so a plain literal is safe
		if (node.store !== null) return { store: node.store, params: {} }

		if (node.paramStore !== null) {
			// Every name is filled by an unwinding frame above
			const names = node.storeNames!
			matchedNames = names
			matchedIndex = names.length - 1

			return {
				store: node.paramStore,
				params: node.nullProto ? Object.create(null) : {}
			}
		}

		if (node.wildcardStore !== null) return wildcardLeaf(node, '', onParam)

		return null
	}

	// Check for a static leaf
	if (node.inert !== null) {
		const inert = node.inert[url.charCodeAt(endIndex)]

		if (inert !== undefined) {
			const route = matchRoute(url, urlLength, inert, endIndex, onParam)

			if (route !== null) return route
		}
	}

	// Check for dynamic leaf
	if (node.params !== null) {
		const { store, storeNames, inert } = node.params
		const slashIndex = url.indexOf('/', endIndex)

		if (slashIndex !== endIndex) {
			// Params cannot be empty
			if (slashIndex === -1 || slashIndex >= urlLength) {
				if (store !== null) {
					const names = storeNames!
					const last = names.length - 1

					if (last > 0) {
						matchedNames = names
						matchedIndex = last - 1
					}

					return {
						store,
						params: seedParams(
							names[last],
							url.substring(endIndex, urlLength),
							onParam,
							node.params!.nullProto
						)
					}
				}
			} else if (inert !== null) {
				const route = matchRoute(
					url,
					urlLength,
					inert,
					slashIndex,
					onParam
				)

				if (route !== null) {
					const name = matchedNames[matchedIndex--]
					const value: unknown = url.substring(endIndex, slashIndex)

					route.params[name] = onParam
						? applyParam(value, name, onParam)
						: value

					return route
				}
			}
		}
	}

	// Check for wildcard leaf
	if (node.wildcardStore !== null)
		return wildcardLeaf(node, url.substring(endIndex, urlLength), onParam)

	return null
}

export default Memoirist
