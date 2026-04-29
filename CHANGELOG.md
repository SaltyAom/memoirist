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
