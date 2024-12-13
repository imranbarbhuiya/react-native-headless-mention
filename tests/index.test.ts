import {
	generateMentionPart,
	generatePlainTextPart,
	generateValueFromPartsAndChangedText,
	generateValueWithAddedSuggestion,
	getMentionDataFromRegExpMatchArray,
	getMentionPartSuggestionKeywords,
	getMentionValue,
	getPartsInterval,
	getValueFromParts,
	isMentionPartType,
	parseValue,
} from '../src/lib/utils';

import type { MentionPartType, PartType } from '../src/lib/types';

const mentionPartType: MentionPartType = {
	trigger: '@',
	pattern: /<(?<trigger>@)(?<id>\d+)>/g,
	getLabel: (mention) => `@${mention.id}`,
	textStyle: { fontWeight: 'bold' },
};

describe('isMentionPartType', () => {
	test('should return true for mentions', () => {
		expect(isMentionPartType({ trigger: '@', pattern: /<(?<trigger>@)(?<id>\d+)>/g })).toBeTruthy();
	});

	test('should return false for patterns', () => {
		expect(isMentionPartType({ pattern: /<(?<trigger>@)(?<id>\d+)>/g })).toBeFalsy();
	});
});

describe('parseValue', () => {
	test('should parse empty text with no part types', () => {
		const result = parseValue('', [], 0);
		expect(result.plainText).toBe('');
		expect(result.parts).toEqual([
			{
				text: '',
				position: { start: 0, end: 0 },
			},
		]);
	});

	test('should parse plain text with no part types', () => {
		const result = parseValue('Hello world', [], 0);
		expect(result.plainText).toBe('Hello world');
		expect(result.parts).toEqual([
			{
				text: 'Hello world',
				position: { start: 0, end: 11 },
			},
		]);
	});

	test('should parse text with mention pattern', () => {
		const testMentionType: MentionPartType = {
			trigger: '@',
			pattern: /<(?<trigger>@)(?<id>\d+)>/g,
			getLabel: (data) => `@user${data.id}`,
		};

		const result = parseValue('Hello <@123>', [testMentionType], 0);
		expect(result.plainText).toBe('Hello @user123');
		expect(result.parts).toHaveLength(2);
		expect(result.parts[0]).toEqual({
			text: 'Hello ',
			position: { start: 0, end: 6 },
		});
		expect(result.parts[1].text).toBe('@user123');
	});

	test('should handle position offset', () => {
		const result = parseValue('test', [], 5);
		expect(result.parts[0].position).toEqual({
			start: 5,
			end: 9,
		});
	});

	test('should handle non-matching patterns', () => {
		const testPartType: PartType = {
			pattern: /\[.*?]/g,
		};

		const result = parseValue('plain text only', [testPartType], 0);
		expect(result.plainText).toBe('plain text only');
		expect(result.parts).toHaveLength(1);
		expect(result.parts[0].text).toBe('plain text only');
	});

	test('should parse mixed content', () => {
		const testMentionType: MentionPartType = {
			trigger: '@',
			pattern: /<(?<trigger>@)(?<id>\d+)>/g,
			getLabel: (data) => `@user${data.id}`,
		};

		const result = parseValue('Start <@123> middle text <@456> end', [testMentionType], 0);
		expect(result.plainText).toBe('Start @user123 middle text @user456 end');
		expect(result.parts).toHaveLength(5);
		expect(result.parts[0].text).toBe('Start ');
		expect(result.parts[2].text).toBe(' middle text ');
		expect(result.parts[4].text).toBe(' end');
	});
});

describe('Mention Input Tests', () => {
	test('Basic text input flow', () => {
		// Initial empty state
		let { parts, plainText } = parseValue('', [mentionPartType]);
		expect(plainText).toBe('');

		// Add simple text
		const [value1, newParts1] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello ');
		expect(value1).toBe('Hello ');
		parts = newParts1;
		plainText = 'Hello ';

		// Add more text
		const [value2] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello world');
		expect(value2).toBe('Hello world');
	});

	test('Mention flow', () => {
		// Start with some text
		let { parts, plainText } = parseValue('Hello ', [mentionPartType]);
		expect(plainText).toBe('Hello ');

		// Add mention trigger
		const [value1, newParts1] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello @');
		parts = newParts1;
		plainText = 'Hello @';
		expect(value1).toBe('Hello @');

		// Get suggestion keywords when cursor is right after @
		const keywords = getMentionPartSuggestionKeywords(
			parts,
			plainText,
			{ start: plainText.length, end: plainText.length },
			[mentionPartType],
		);
		expect(keywords['@']).toBeUndefined();

		// Type partial mention
		const [value2, newParts2] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello @jo');
		parts = newParts2;
		plainText = 'Hello @jo';
		expect(value2).toBe('jo');

		// Complete mention
		const newValue = generateValueWithAddedSuggestion(
			parts,
			mentionPartType,
			plainText,
			{ start: plainText.length, end: plainText.length },
			{ id: '123' },
		);
		expect(newValue).toBeUndefined();

		// Parse completed mention
		const { parts: finalParts, plainText: finalPlainText } = parseValue('Hello <@123> ', [mentionPartType]);
		expect(finalPlainText).toBe('Hello @123 ');
		expect(finalParts).toHaveLength(3); // "Hello ", mention part, " "
	});

	test('Backspace behavior', () => {
		// Start with text and mention
		const { parts, plainText } = parseValue('Hello <@123> world', [mentionPartType]);
		expect(plainText).toBe('Hello @123 world');

		// Backspace at the end
		const [value1] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello @123 worl');
		expect(value1).toBe('Hello <@123> worl'); // Should maintain mention markup

		// Backspace into mention
		const [value2] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello @12');
		expect(value2).toBe('Hello @12'); // When mention is broken, it becomes plain text
	});

	test('Multiple mentions', () => {
		// Start empty
		const { parts, plainText } = parseValue('', [mentionPartType]);

		// Add first mention
		let newValue = generateValueWithAddedSuggestion(
			parts,
			mentionPartType,
			plainText,
			{ start: 0, end: 0 },
			{ id: '123' },
		);
		expect(newValue).toBe('<@123>');

		// Parse result and add second mention
		const result = parseValue(newValue!, [mentionPartType]);
		newValue = generateValueWithAddedSuggestion(
			result.parts,
			mentionPartType,
			result.plainText,
			{ start: result.plainText.length, end: result.plainText.length },
			{ id: '456' },
		);
		expect(newValue).toBe('<@456>');

		// Final parse to verify structure
		const final = parseValue('<@123><@456>', [mentionPartType]);
		expect(final.plainText).toBe('@123@456');
		expect(final.parts).toHaveLength(3); // First mention, empty text between mentions, second mention
	});
});

describe('Utils Tests', () => {
	describe('generatePlainTextPart and generateMentionPart', () => {
		test('generatePlainTextPart with position offset', () => {
			const part = generatePlainTextPart('hello', 5);
			expect(part).toEqual({
				text: 'hello',
				position: {
					start: 5,
					end: 10
				}
			});
		});

		test('generateMentionPart with position offset', () => {
			const mention = {
				id: '123',
				original: '<@123>',
				trigger: '@'
			};
			const part = generateMentionPart(mentionPartType, mention, 5);
			expect(part).toEqual({
				text: '@123',
				position: {
					start: 5,
					end: 9
				},
				partType: mentionPartType,
				data: mention
			});
		});
	});

	describe('getValueFromParts', () => {
		test('should concatenate parts correctly', () => {
			const parts = [
				generatePlainTextPart('Hello '),
				generateMentionPart(mentionPartType, { id: '123', original: '<@123>', trigger: '@' }),
				generatePlainTextPart('!')
			];
			expect(getValueFromParts(parts)).toBe('Hello <@123>!');
		});
	});

	describe('getMentionValue', () => {
		test('should format mention value correctly', () => {
			const suggestion = { id: '123', display: 'John' };
			expect(getMentionValue('@', suggestion)).toBe('<@123>');
		});
	});

	describe('getPartsInterval', () => {
		test('should handle empty parts array', () => {
			const result = getPartsInterval([], 0, 5);
			expect(result).toEqual([]);
		});

		test('should handle single part interval', () => {
			const parts = [generatePlainTextPart('Hello')];
			const result = getPartsInterval(parts, 0, 5);
			expect(result).toHaveLength(1);
			expect(result[0].text).toBe('Hello');
		});

		test('should handle partial part interval', () => {
			const parts = [generatePlainTextPart('Hello world')];
			const result = getPartsInterval(parts, 0, 5);
			expect(result).toHaveLength(1);
			expect(result[0].text).toBe('Hello');
		});
	});

	describe('getMentionDataFromRegExpMatchArray', () => {
		test('should extract mention data from regex match with groups', () => {
			const match = /<(?<trigger>@)(?<id>\d+)>/.exec('<@123>');
			const result = getMentionDataFromRegExpMatchArray(match!);
			expect(result).toEqual({
				id: '123',
				trigger: '@',
				original: '<@123>',
				result: match
			});
		});

		test('should handle regex match without groups', () => {
			// eslint-disable-next-line prefer-named-capture-group
			const regex = /<(@)(\d+)>/;
			const match = regex.exec('<@123>');
			const result = getMentionDataFromRegExpMatchArray(match!);
			expect(result).toEqual({
				id: '123',
				trigger: '@',
				original: '<@123>',
				result: match
			});
		});
	});

	describe('parseValue edge cases', () => {
		test('should handle multiple part types with no matches', () => {
			const hashtagPartType: PartType = {
				pattern: /#[a-z]+/g
			};
			const result = parseValue('plain text', [hashtagPartType, mentionPartType]);
			expect(result.plainText).toBe('plain text');
			expect(result.parts).toHaveLength(1);
		});

		test('should handle regex pattern part type', () => {
			const urlPartType: PartType = {
				pattern: /https?:\/\/\S+/g
			};
			const result = parseValue('Visit https://example.com', [urlPartType]);
			expect(result.parts).toHaveLength(2);
			expect(result.parts[1].text).toBe('https://example.com');
		});

		test('should handle multiple mentions with text between', () => {
			const text = 'Hello <@123> and <@456>';
			const result = parseValue(text, [mentionPartType]);
			expect(result.parts).toHaveLength(4);
			expect(result.plainText).toBe('Hello @123 and @456');
		});
	});
});
