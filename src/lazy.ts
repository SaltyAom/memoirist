import { Memoirist } from './index'
import type { FindResult, MaybeArray, ProcessParam } from './type'

export class LazyMemoirist<T> extends Memoirist<T> {
	deferred: [string, string, T][] = []
	private built = false

	constructor(onParam?: MaybeArray<ProcessParam>) {
		super(onParam)
		this.find = this.lazyFind
	}

	add(method: string, path: string, store: T): FindResult<T>['store'] {
		this.built = false
		this.deferred.push([method, path, store])
		this.find = this.lazyFind

		return store
	}

	build(): void {
		if (this.built) return

		for (const [method, path, store] of this.deferred)
			super.add(method, path, store, false)

		this.deferred = []
		this.built = true
		this.find = Memoirist.prototype.find
	}

	private lazyFind(method: string, url: string): FindResult<T> | null {
		this.build()

		return this.find(method, url)
	}
}

export default LazyMemoirist
