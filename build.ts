import { build } from 'tsdown'

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
