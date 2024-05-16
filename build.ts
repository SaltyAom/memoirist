import { $ } from 'bun'
import { build, type Options } from 'tsup'

const tsupConfig: Options = {
	entry: ['src/**/*.ts'],
	splitting: false,
	sourcemap: false,
	clean: true,
	bundle: true
	// outExtension() {
	// 	return {
	// 		js: '.js'
	// 	}
	// }
} satisfies Options

await Promise.all([
	// ? tsup esm
	build({
		outDir: 'dist',
		format: 'esm',
		target: 'node20',
		cjsInterop: false,
		...tsupConfig
	}),
	// ? tsup cjs
	build({
		outDir: 'dist/cjs',
		format: 'cjs',
		target: 'node20',
		dts: true,
		...tsupConfig
	})
])

await Bun.build({
	entrypoints: ['./src/index.ts'],
	outdir: './dist/bun',
	minify: true,
	target: 'bun',
	sourcemap: 'external',
	external: ['@sinclair/typebox']
})

await $`cp dist/cjs/index*.d.ts dist/bun`
await $`cp dist/cjs/index*.d.ts dist`

process.exit()
