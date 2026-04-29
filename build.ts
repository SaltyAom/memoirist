import { $ } from 'bun'
import { build } from 'tsdown'

await $`rm -rf dist`

await build({
	outDir: 'dist',
	entry: ['src/**/*.ts'],
	sourcemap: true,
	clean: true,
	cjsDefault: false,
	target: 'node20',
	format: ['esm', 'cjs'],
})

// await $`cp dist/cjs/index*.d.ts dist/bun`
// await $`cp dist/cjs/index*.d.ts dist`

process.exit()
