# memoirist — dynamic-params cost handoff (from Elysia 2 P1 investigation)

Plan for closing the params-construction overhead in memoirist 1.x, written for an
agent with no prior context. Origin: Elysia 2 dynamic-route dispatch investigation
(2026-07-24) — `GET /user/:id` is +27% vs Elysia 1 while plain routes are +16%;
most of the ~44 ns dynamic-specific residual attributes to memoirist 1.2.0's
params path. Framework-side micro-fixes (decodeParams `%`-guard) measured as a
wash; the remaining lever is in memoirist itself.

- **Elysia testbed:** `~/Documents/web/demo/elysia-aot` (`elysia` = linked v2,
  `elysia1` = npm alias elysia@1.4.29). `bun run stress/compare-throughput.ts`
  prints both composed handlers + per-route ns.
- **Reference dists:** memoirist **1.2.0** under the linked elysia
  (`node_modules/memoirist/dist/index.mjs`), memoirist **0.4.0** under
  `node_modules/elysia1/node_modules/memoirist/` (testbed).
- **Runtime:** Bun (JSC) is the primary target — benchmark there first; V8 note
  below. Same-machine before/after deltas only.

## What 1.2.0 does that 0.4.0 didn't (verified against both dists)

| | 0.4.0 (v1's pin) | 1.2.0 (v2's pin) |
| --- | --- | --- |
| params object | plain `{}` literal | `Object.create(null)` in `buildParams` (dist ~:42-54) |
| param writes | inline `params[name] = url.substring(...)` at match time (~:254-292) | collected into a shared module-level `scratch` array with push/pop bookkeeping during radix descent (~:225-232), then looped into the object |
| extras | — | `storeNames`/`captures` machinery; `loosePath` retry branch (~:178-181, harmless on hits) |

Costs: `Object.create(null)` allocates via the generic path (no inline-cached
hidden class); null-proto objects are slower to iterate downstream; scratch
push/pop runs per descent including backtracked branches.

## Step 0 — clean attribution (do this first)

Isolated microbench, no Elysia: same route table (static mix + `/user/:id` +
multi-param + wildcard) registered in BOTH versions, `find()` in a mitata loop.
Splits "matching algorithm" from "params construction" — the Elysia-side numbers
never isolated this. If 1.2.0's *matching* is already at parity and only
params-construction lags, the fix below is sufficient; if matching itself
regressed, that's a separate finding to report before proceeding.

## Step 1 — benchmark the params-object strategies

Candidates, measured on Bun/JSC (and optionally Node/V8):

1. `Object.create(null)` (current) — baseline.
2. Plain `{}` literal.
3. **`{ __proto__: null }` literal** (maintainer suggestion) — in V8 this form
   gets a cached hidden class and is much faster than `Object.create(null)`;
   JSC behavior needs measuring, don't assume parity with V8. Preferably, if it's faster in Bun (JavaScript Core) then use it; if not, fall back to the plain literal.
4. Per-route pre-shaped template: param names are known at `add()` time, so a
   per-route `() => ({ id: '' })`-style factory yields a monomorphic shape per
   route — the ceiling; costs a closure per dynamic route.

Also measure downstream iteration (`for…in` over the result) per strategy —
Elysia's decodeParams walks it when the path contains `%`.

## Step 2 — safety matrix for dropping null-proto

The only reason null-proto matters: a route pattern literally naming a param
`:__proto__` (or `:constructor` etc.). On a plain object,
`params["__proto__"] = <string>` is a silent no-op (param lost), NOT prototype
pollution — but silent loss is still a behavior change vs 1.2.0.

Param names are developer-controlled and known at `add()` time → decide the
strategy **per route at registration** (one-time check), e.g. dangerous name in
pattern → null-proto (or template with a sanitized shape), otherwise the fast
literal. Add tests: `:__proto__`, `:constructor`, `:hasOwnProperty` patterns
round-trip correctly whichever strategy is picked.

## Step 3 — implement + drop scratch round-trip if feasible

- `buildParams` switches to the Step-1 winner (per-route decision from Step 2).
- Evaluate writing params directly at match time for the no-backtrack common
  case (what 0.4.0 did), keeping scratch only where backtracking requires it.
- Keep the return shape `{ store, params }` — Elysia reads both; do not change
  `loosePath` semantics (Elysia relies on loose matching for dynamic routes —
  elysia repo #1752 context: static map stays loose, dynamic dedup is loose-path
  aware).
- Bundle size note: memoirist is 8.4 KB of Elysia's 101 KB static-kernel bundle;
  any size trim lands directly on the Hono-parity number. Don't grow it.

## Step 4 — verification

1. memoirist's own suite green + the new dangerous-param-name tests.
2. Link into Elysia: memoirist repo → `bun link`; in
   `~/Documents/web/elysia/elysia` point memoirist at the link, `bun run build
   && bun link`; testbed `bun link elysia`.
3. `bun run stress/compare-throughput.ts` — **success: `GET /user/:id` gap vs
   elysia1 drops toward the plain-route gap** (≈+16%; was +27%). Ratios from the
   same run, same machine.
4. Guard rails: plain `GET /`, `POST /json`, `GET /search` rows unchanged;
   `bun test` in elysia (full suite, currently 3749/0) — params behavior is
   covered by percent-encoding, wildcard, loose-path, and websocket routing
   tests there.
5. Elysia kernel path uses the same router (`createStaticFetch`): testbed
   `bench/matrix.ts` kernel row must not regress.

## Elysia-side follow-ups (this repo, after memoirist lands)

- Re-run the P1 attribution: with params construction fixed, check whether the
  two failed static-map hash lookups on the dynamic path
  (`map[method][path]` then `map['*'][path]`, src/handler/fetch.ts:686-708) are
  now worth the micro-opt; they were below noise before.
- If the dynamic gap still exceeds the plain gap, the remainder is the
  interpreted-dispatch baseline (v1 emits a compiled `map()`); that's
  PARITY-kernel territory for AOT apps and a deliberate non-goal for JIT mode.

---

## Results (executed 2026-07-25, Bun 1.3.14 / M1 Max)

**The plan's core premise is falsified.** Per-process microbench (`bun
benchmarks/params.bench.ts <version>`; mitata's in-process ordering skews
cross-version comparison by up to 30%, so never compare versions in one process):

| route | 0.4.0 | 1.2.0 | this change |
| --- | ---: | ---: | ---: |
| static | 29.8 | 39.7 | **30.0** |
| 1 param | 56.4 | 63.3 | **60.9** |
| 2 param | 79.5 | 91.4 | **87.9** |
| wildcard | 31.5 | 38.7 | **34.8** |

1.2.0 costs only **~6ns** more than 0.4.0 on `/user/:id`, not the ~44ns the
investigation attributed to it. Elysia's dynamic-route gap is ~65ns, so the
router was never the lever: `GET /user/:id` stays at **1.27–1.31x vs elysia1**
before and after, and the guard-rail rows (plain, POST /json, GET /search) are
unchanged. Step 4.3's success criterion cannot be met from memoirist's side.

What the cost actually was (neither was `Object.create(null)`):

1. **~8ns/find on every route, params or not** — any conditional between
   `node.store !== null` and the returned object literal at the static leaf
   blocks JSC from sinking the allocation. 1.2.0 checked `storeNames.length`
   there; 0.4.0 returned unconditionally. Fixed by moving param-carrying static
   routes to their own `paramStore` slot so the hot return stays branch-free.
2. **~3-4ns on param routes** — the `scratch` push/pop round-trip plus the
   `buildParams` loop. Fixed by writing params as the match unwinds (0.4.0's
   shape) via `matchedNames`/`matchedIndex`, keeping per-store `storeNames` so
   sibling routes may still use different param names at the same position.

`Object.create(null)` measured free at every site once those were fixed, so
null-proto params are kept everywhere — Step 2's per-route strategy matrix is
unnecessary and `:__proto__` still round-trips (`test/unwind.test.ts`).

Cost: +104 bytes minified (3772 → 3876), +348 bytes in Elysia's static-kernel
bundle (103700 → 104048). Elysia's suite: 3749/0 with this version linked.

**Elysia-side follow-up supersedes the two listed below:** the ~65ns dynamic
residual is in Elysia, not memoirist. Re-attribute it there — the two failed
static-map hash lookups and the interpreted-dispatch baseline are now the whole
story, not the tail.
