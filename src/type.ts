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
