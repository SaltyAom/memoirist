import { $ } from 'bun'
import { build } from 'tsdown'

await $`rm -rf dist`

await build({
	outDir: 'dist',
	entry: ['src/**/*.ts'],
	clean: true,
	cjsDefault: false,
	target: 'node20',
	format: ['esm', 'cjs'],
	dts: true,
	outExtensions(c) {
		return {
			dts: '.d.ts',
			js: c.format === 'es' ? '.mjs' : '.js'
		}
	}
})

// await $`cp dist/cjs/index*.d.ts dist/bun`
// await $`cp dist/cjs/index*.d.ts dist`

process.exit()
