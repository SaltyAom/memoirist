export interface FindResult<T> {
	store: T
	params: Record<string, any>
}

export interface ParamNode<T> {
	store: T | null
	storeNames: string[] | null
	inert: Node<T> | null
}

export interface Node<T> {
	part: string
	store: T | null
	storeNames: string[] | null
	inert: Record<number, Node<T>> | null
	params: ParamNode<T> | null
	wildcardStore: T | null
	wildcardStoreNames: string[] | null
}

export type MaybeArray<T> = T | T[]

export type ProcessParam = (value: string, key: string) => unknown

export interface MemoiristOptions {
	/** Param decode / transform hook, run per matched param */
	onParam?: MaybeArray<ProcessParam>

	/**
	 * Match a path ignoring a trailing slash on lookup miss instead of
	 * registering both `/path` and `/path/` variants eagerly. Opt-in.
	 */
	loosePath?: boolean
}
