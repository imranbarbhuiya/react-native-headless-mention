import common from 'eslint-config-mahir/common';
import edge from 'eslint-config-mahir/edge';
import node from 'eslint-config-mahir/node';
import typescript from 'eslint-config-mahir/typescript';

/**
 * @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigArray}
 */
export default [
	...common,
	...node,
	...typescript,
	...edge,
	{
		ignores: ['.github', '.yarn', 'dist'],
		rules: {
			'import/order': 'off',
		},
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mjs', 'tsup.config.ts'],
					defaultProject: 'tsconfig.eslint.json',
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
];
