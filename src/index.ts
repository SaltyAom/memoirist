export interface FindResult<T> {
	store: T
	params: Record<string, any>
}

export interface ParamNode<T> {
	name: string
	store: T | null
	inert: Node<T> | null
}

export interface Node<T> {
	part: string
	store: T | null
	inert: Record<number, Node<T>> | null
	params: ParamNode<T> | null
	wildcardStore: T | null
}

const createNode = <T>(part: string, inert?: Node<T>[]): Node<T> => {
	const inertMap: Record<number, Node<T>> | null = inert?.length ? {} : null

	if (inertMap)
		for (const child of inert!) inertMap[child.part.charCodeAt(0)] = child

	return {
		part,
		store: null,
		inert: inertMap,
		params: null,
		wildcardStore: null
	}
}

const cloneNode = <T>(node: Node<T>, part: string) => ({
	...node,
	part
})

const createParamNode = <T>(name: string): ParamNode<T> => ({
	name,
	store: null,
	inert: null
})

type MaybeArray<T> = T | T[]

type ProcessParam = (value: string, key: string) => unknown

export interface Config {
	/**
	 * lazily create nodes
	 *
	 * @default undefined
	 * @since 0.3.0
	 */
	lazy?: boolean
	/**
	 * process dynamic parameter
	 */
	onParam?: MaybeArray<ProcessParam>
}

export class Memoirist<T> {
	root: Record<string, Node<T>> = {}
	history: [string, string, T][] = []
	deferred: [string, string, T][] = []

	constructor(public config: Config = {}) {
		if (config.lazy)
			// @ts-expect-error
			this.find = this.lazyFind

		if (config.onParam && !Array.isArray(config.onParam))
			this.config.onParam = [
				this.config.onParam as (param: string) => unknown
			]
	}

	private static regex = {
		static: /:.+?(?=\/|$)/,
		params: /:.+?(?=\/|$)/g,
		optionalParams: /(\/:\w+\?)/g
	}

	private lazyFind = (method: string, url: string) => {
		if (!this.config.lazy) return this.find

		this.build()

		return this.find(method, url)
	}

	build() {
		if (!this.config.lazy) return

		for (const [method, path, store] of this.deferred)
			this.add(method, path, store, { lazy: false, ignoreHistory: true })

		this.deferred = []

		this.find = (method: string, url: string): FindResult<T> | null => {
			const root = this.root[method]
			if (!root) return null

			return matchRoute(
				url,
				url.length,
				root,
				0,
				this.config.onParam as ProcessParam[]
			)
		}
	}

	add(
		method: string,
		path: string,
		store: T,
		{
			ignoreError = false,
			ignoreHistory = false,
			lazy = this.config.lazy
		}: {
			ignoreError?: boolean
			ignoreHistory?: boolean
			lazy?: boolean
		} = {}
	): FindResult<T>['store'] {
		if (lazy) {
			// @ts-expect-error
			this.find = this.lazyFind
			this.deferred.push([method, path, store])

			return store
		}

		if (typeof path !== 'string')
			throw new TypeError('Route path must be a string')

		if (path === '') path = '/'
		else if (path[0] !== '/') path = `/${path}`

		const isWildcard = path[path.length - 1] === '*'
		// End with ? and is param
		const optionalParams = path.match(Memoirist.regex.optionalParams)

		if (optionalParams) {
			const originalPath = path.replaceAll('?', '')
			this.add(method, originalPath, store, {
				ignoreError,
				ignoreHistory,
				lazy
			})

			for (let i = 0; i < optionalParams.length; i++) {
				let newPath = path.replace(optionalParams[i], '')

				this.add(method, newPath, store, {
					ignoreError: true,
					ignoreHistory,
					lazy
				})
			}

			return store
		}

		if (optionalParams) path = path.replaceAll('?', '')

		if (this.history.find(([m, p, s]) => m === method && p === path))
			return store

		if (
			isWildcard ||
			(optionalParams && path.charCodeAt(path.length - 1) === 63)
		)
			// Slice off trailing '*'
			path = path.slice(0, -1)

		if (!ignoreHistory) this.history.push([method, path, store])

		const inertParts = path.split(Memoirist.regex.static)
		const paramParts = path.match(Memoirist.regex.params) || []

		if (inertParts[inertParts.length - 1] === '') inertParts.pop()

		let node: Node<T>

		if (!this.root[method]) node = this.root[method] = createNode<T>('/')
		else node = this.root[method]

		let paramPartsIndex = 0

		for (let i = 0; i < inertParts.length; ++i) {
			let part = inertParts[i]

			if (i > 0) {
				// Set param on the node
				const param = paramParts[paramPartsIndex++].slice(1)

				if (node.params === null) node.params = createParamNode(param)
				else if (node.params.name !== param) {
					if (ignoreError) return store
					else
						throw new Error(
							`Cannot create route "${path}" with parameter "${param}" ` +
								'because a route already exists with a different parameter name ' +
								`("${node.params.name}") in the same location`
						)
				}

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
					if (node.inert === null) node.inert = {}

					const inert = node.inert[part.charCodeAt(j)]

					if (inert) {
						// Re-run loop with existing static node
						node = inert
						part = part.slice(j)
						j = 0
						continue
					}

					// Create new node
					const childNode = createNode<T>(part.slice(j))
					node.inert[part.charCodeAt(j)] = childNode
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
			const param = paramParts[paramPartsIndex]
			const name = param.slice(1)

			if (node.params === null) node.params = createParamNode(name)
			else if (node.params.name !== name) {
				if (ignoreError) return store
				else
					throw new Error(
						`Cannot create route "${path}" with parameter "${name}" ` +
							'because a route already exists with a different parameter name ' +
							`("${node.params.name}") in the same location`
					)
			}

			if (node.params.store === null) node.params.store = store

			return node.params.store!
		}

		if (isWildcard) {
			// The final part is a wildcard
			if (node.wildcardStore === null) node.wildcardStore = store

			return node.wildcardStore!
		}

		// The final part is static
		if (node.store === null) node.store = store

		return node.store!
	}

	find(method: string, url: string): FindResult<T> | null {
		const root = this.root[method]
		if (!root) return null

		return matchRoute(
			url,
			url.length,
			root,
			0,
			this.config.onParam as ProcessParam[]
		)
	}
}

const matchRoute = <T>(
	url: string,
	urlLength: number,
	node: Node<T>,
	startIndex: number,
	onParam?: ProcessParam[]
): FindResult<T> | null => {
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
		if (node.store !== null)
			return {
				store: node.store,
				params: {}
			}

		if (node.wildcardStore !== null)
			return {
				store: node.wildcardStore,
				params: { '*': '' }
			}

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
		const { store, name, inert } = node.params
		const slashIndex = url.indexOf('/', endIndex)

		if (slashIndex !== endIndex) {
			// Params cannot be empty
			if (slashIndex === -1 || slashIndex >= urlLength) {
				if (store !== null) {
					// This is much faster than using a computed property
					const params: Record<string, string> = {}
					params[name] = url.substring(endIndex, urlLength)
					if (onParam)
						for (let i = 0; i < onParam.length; i++) {
							let temp = onParam[i](params[name], name)
							if (temp !== undefined) params[name] = temp as any
						}

					return {
						store,
						params
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
					route.params[name] = url.substring(endIndex, slashIndex)
					if (onParam)
						for (let i = 0; i < onParam.length; i++) {
							let temp = onParam[i](route.params[name], name)
							if (temp !== undefined)
								route.params[name] = temp as any
						}

					return route
				}
			}
		}
	}

	// Check for wildcard leaf
	if (node.wildcardStore !== null)
		return {
			store: node.wildcardStore,
			params: {
				'*': url.substring(endIndex, urlLength)
			}
		}

	return null
}

export default Memoirist
