export interface FindResult<T> {
	store: T
	params: Record<string, any>
}

export interface ParamNode<T> {
	store: T | null
	storeNames: string[] | null
	/** Route names a param `__proto__`, so its params need a null prototype */
	nullProto: boolean
	inert: Node<T> | null
}

export interface Node<T> {
	part: string
	/** Static store whose route captured no params — returned without a branch */
	store: T | null
	/** Static store whose route captured params (needs storeNames) */
	paramStore: T | null
	/** Route names a param `__proto__`, so its params need a null prototype */
	nullProto: boolean
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
