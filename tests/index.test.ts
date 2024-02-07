import { isMentionPartType } from '../src/lib/utils';

describe('Tests', () => {
	test('should pass', () => {
		expect(isMentionPartType({ trigger: '@', pattern: /\d+/g })).toBeTruthy();
	});
});
