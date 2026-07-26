/** @type {import('jest').Config} */
export default {
	preset: '@react-native/jest-preset',
	// The RN preset still pins jest-environment-node 29, which is incompatible with the jest 30 runtime
	testEnvironment: 'node',
	collectCoverageFrom: ['src/**/*.{ts,tsx}'],
	coverageReporters: ['text', 'lcov', 'clover'],
};
