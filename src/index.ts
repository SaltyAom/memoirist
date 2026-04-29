import type {
	FindResult,
	MaybeArray,
	Node,
	ParamNode,
	ProcessParam
} from './type'

export type {
	FindResult,
	MaybeArray,
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

function buildParams(
	names: string[],
	captures: string[],
	onParam?: ProcessParam
): Record<string, string> {
	const params: Record<string, string> = Object.create(null)

	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		let value = captures[i]

		if (onParam) {
			const temp = onParam(value, name)
			if (temp !== undefined) value = temp as string
		}

		params[name] = value
	}

	return params
}

// Reused by every find() call. matchRoute is synchronous and balances every
// push with a pop before returning, so length is always 0 on entry/exit.
const scratch: string[] = []

const pattern = {
	static: /:.+?(?=\/|$)/,
	params: /:.+?(?=\/|$)/g,
	optionalParams: /(\/:\w+\?)/g
} as const

export class Memoirist<T> {
	root: Record<string, Node<T>> = Object.create(null)
	history: [string, string, T][] = []
	onParam?: ProcessParam

	constructor(onParam?: MaybeArray<ProcessParam>) {
		if (onParam)
			this.onParam = Array.isArray(onParam)
				? onParam.length === 1
					? onParam[0]
					: composeOnParam(onParam)
				: onParam
	}

	add(
		method: string,
		path: string,
		store: T,
		keepHistory?: boolean
	): FindResult<T>['store'] {
		if (!path) path = '/'
		else if (path[0] !== '/') path = `/${path}`

		const isWildcard = path[path.length - 1] === '*'
		// End with ? and is param
		const optionalParams = path.match(pattern.optionalParams)

		if (optionalParams) {
			const originalPath = path.replaceAll('?', '')
			this.add(method, originalPath, store, keepHistory)

			for (let i = 0; i < optionalParams.length; i++) {
				let newPath = path.replace(optionalParams[i], '')

				this.add(method, newPath, store, keepHistory)
			}

			return store
		}

		if (optionalParams) path = path.replaceAll('?', '')

		if (
			this.history.find(function ([m, p]) {
				return m === method && p === path
			})
		)
			return store

		if (
			isWildcard ||
			(optionalParams && path.charCodeAt(path.length - 1) === 63)
		)
			// Slice off trailing '*'
			path = path.slice(0, -1)

		if (keepHistory !== false) this.history.push([method, path, store])

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

			if (node.params.store === null) {
				node.params.store = store
				node.params.storeNames = paramNames
			}

			return node.params.store!
		}

		if (isWildcard) {
			// The final part is a wildcard
			paramNames.push('*')

			if (node.wildcardStore === null) {
				node.wildcardStore = store
				node.wildcardStoreNames = paramNames
			}

			return node.wildcardStore!
		}

		// The final part is static
		if (node.store === null) {
			node.store = store
			node.storeNames = paramNames
		}

		return node.store!
	}

	find(method: string, url: string): FindResult<T> | null {
		const root = this.root[method]
		if (!root) return null

		return matchRoute(url, url.length, root, 0, this.onParam, scratch)
	}
}

function matchRoute<T>(
	url: string,
	urlLength: number,
	node: Node<T>,
	startIndex: number,
	onParam: ProcessParam | undefined,
	captures: string[]
): FindResult<T> | null {
	const part = node.part
	const length = part.length
	const endIndex = startIndex + length

	// Only check the pathPart if its length is > 1 since the parent has
	// already checked that the url matches the first character
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
		if (node.store !== null) {
			const names = node.storeNames!
			return {
				store: node.store,
				params:
					names.length === 0
						? Object.create(null)
						: buildParams(names, captures, onParam)
			}
		}

		if (node.wildcardStore !== null) {
			captures.push('')
			const params = buildParams(
				node.wildcardStoreNames!,
				captures,
				onParam
			)
			captures.pop()

			return {
				store: node.wildcardStore,
				params
			}
		}

		return null
	}

	// Check for a static leaf
	if (node.inert !== null) {
		const inert = node.inert[url.charCodeAt(endIndex)]

		if (inert !== undefined) {
			const route = matchRoute(
				url,
				urlLength,
				inert,
				endIndex,
				onParam,
				captures
			)

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
					captures.push(url.substring(endIndex, urlLength))
					const params = buildParams(storeNames!, captures, onParam)
					captures.pop()

					return {
						store,
						params
					}
				}
			} else if (inert !== null) {
				captures.push(url.substring(endIndex, slashIndex))
				const route = matchRoute(
					url,
					urlLength,
					inert,
					slashIndex,
					onParam,
					captures
				)
				captures.pop()

				if (route !== null) return route
			}
		}
	}

	// Check for wildcard leaf
	if (node.wildcardStore !== null) {
		captures.push(url.substring(endIndex, urlLength))
		const params = buildParams(node.wildcardStoreNames!, captures, onParam)
		captures.pop()

		return {
			store: node.wildcardStore,
			params
		}
	}

	return null
}

export default Memoirist
