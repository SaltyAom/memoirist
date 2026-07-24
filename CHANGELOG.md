# 1.2.1 - 25 Jul 2026
behavior:
- param keys are inserted deepest-first: `Object.keys` on `/:a/:b/:c` now returns `c, b, a` instead of `a, b, c`. Values and lookups are unchanged; only enumeration order differs

improvement:
- `find` is 4–24% faster than 1.2.0
- params are written while the match unwinds instead of being collected into a shared scratch array and rebuilt at the leaf, removing the push/pop round-trip and the rebuild loop
- param-carrying static routes moved to a separate `paramStore` slot so the no-param static return stays a branch-free literal, any condition between the store check and the returned object costs ~8ns per `find` on JSC, which is what made every route, params or not, slower in 1.2.0

internal:
- remove `buildParams` and the module-level scratch array
- `Node` gains a `paramStore` field; `storeNames` is now set only for param-carrying static routes

# 1.2.0 - 13 Jul 2026
breaking:
- remove the write-only `history` collection and internal fourth `add` argument

behavior:
- registration route is now last-win

# 1.1.0 - 25 Jun 2026
breaking:
- constructor now takes an options object instead of a bare `onParam`: `new Memoirist({ onParam })` instead of `new Memoirist(onParam)`

feature:
- `loosePath`: opt-in trailing-slash matching. With `new Memoirist({ loosePath: true })`, a lookup miss retries once with the trailing slash toggled (`/users/` → `/users` and vice-versa) instead of registering both variants eagerly. Off by default; the hot path is unchanged.

# 1.0.3 - 10 May 2026
fix:
- LEFT-fill trailing optional params: `/name/:last?/:first?` matched against `/name/x` now binds `{ last: 'x' }` instead of `{ first: 'x' }`, matching Express / Fastify / Hono / react-router

# 1.0.2 - 6 May 2026
fix:
- cjs import path

# 1.0.1 - 29 Apr 2026
fix:
- use `.d.ts` instead of `.d.mts` for type exports

# 1.0.0 - 29 Apr 2026
breaking:
- remove `Config` wrapper; constructor now takes `onParam` directly: `new Memoirist(fn)` instead of `new Memoirist({ onParam: fn })`
- move lazy mode to a separate `LazyMemoirist` class in `memoirist/lazy`; `Memoirist` no longer accepts a `lazy` flag
- routes with conflicting param names at the same position no longer throw; each route preserves its own param names (`/name/:name` and `/name/:id/:name` can coexist)
- minimum target is set to Node 22

feature:
- per-route param names: param keys returned by `find` reflect the matched route, not the first-registered name
- types extracted to `memoirist/type` subpath export

improvement:
- reuse a single scratch array across `find` calls instead of allocating per call
- short-circuit `buildParams` on static-leaf hits
- benchmarks: `find` is 5–28% faster across static / single-param / nested-param / wildcard scenarios; p99 tail latency cut roughly in half
- migrate from `tsup` to `tsdown`

internal:
- arrow helpers converted to `function` declarations in `src/`
- empty object literals replaced with `Object.create(null)`
- `onParam` accepts a `MaybeArray<ProcessParam>` but is composed into a single function internally

# 0.4.0 - 6 Aug 2025
feature:
- add onParam

# 0.3.1 - 3 Jun 2025
fix:
[elysia#1234](https://github.com/elysiajs/elysia/issues/1234) handle optional path parameters after required

# 0.3.0 - 9 Jan 2024
feature:
- lazy evaluation

# 0.2.0 - 17 May 2024
feature:
- optional param

change:
- change inert structure from Map to Record

# 0.1.5 - 15 May 2023
fix:
- add exports field support

# 0.1.4 - 15 May 2023
fix:
- add commonjs support

# 0.1.3 - 6 May 2023
feat:
- using charCodeAt

# 0.1.2 - 25 Apr 2023
feat:
- handle not found

# 0.1.1 - 25 Apr 2023
feat:
- add history

# 0.1.0 - 25 Apr 2023
feat:
- init
