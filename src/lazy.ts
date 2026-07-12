import { Memoirist } from './index'
import type { FindResult, MemoiristOptions } from './type'

export class LazyMemoirist<T> extends Memoirist<T> {
	deferred: [string, string, T][] = []

	constructor(options?: MemoiristOptions) {
		super(options)
		this.find = this.lazyFind
	}

	add(method: string, path: string, store: T): FindResult<T>['store'] {
		this.deferred.push([method, path, store])
		this.find = this.lazyFind

		return store
	}

	build(): void {
		for (const [method, path, store] of this.deferred)
			super.add(method, path, store)

		this.deferred = []
		this.find = Memoirist.prototype.find
	}

	private lazyFind(method: string, url: string): FindResult<T> | null {
		this.build()

		return this.find(method, url)
	}
}

export default LazyMemoirist
