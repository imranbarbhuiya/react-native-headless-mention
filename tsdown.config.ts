import { defineConfig } from 'tsdown';

export default defineConfig({
	clean: true,
	dts: true,
	entry: ['src/index.tsx'],
	format: ['esm', 'cjs'],
	minify: false,
	platform: 'neutral',
	sourcemap: true,
	target: 'esnext',
	tsconfig: 'src/tsconfig.json',
	treeshake: true,
	deps: {
		neverBundle: true,
	},
});
