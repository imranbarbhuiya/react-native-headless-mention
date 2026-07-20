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

const applyTextChange = (value: string, nextPlainText: string, partTypes: PartType[] = [mentionPartType]) => {
	const { parts, plainText } = parseValue(value, partTypes);
	const [nextValue] = generateValueFromPartsAndChangedText(parts, plainText, nextPlainText);
	return nextValue;
};

describe('Mention Input Tests', () => {
	test('Basic text input flow', () => {
		let value = '';
		expect(parseValue(value, [mentionPartType]).plainText).toBe('');
		value = applyTextChange(value, 'Hello ');
		expect(value).toBe('Hello ');
		value = applyTextChange(value, 'Hello world');
		expect(value).toBe('Hello world');
	});

	test('Mention flow', () => {
		let value = 'Hello ';
		value = applyTextChange(value, 'Hello @');
		expect(value).toBe('Hello @');
		value = applyTextChange(value, 'Hello @jo');
		expect(value).toBe('Hello @jo');
		const { parts, plainText } = parseValue(value, [mentionPartType]);
		const keywords = getMentionPartSuggestionKeywords(
			parts,
			plainText,
			{ start: plainText.length, end: plainText.length },
			[mentionPartType],
		);
		expect(keywords['@']).toBe('jo');
		const newValue = generateValueWithAddedSuggestion(
			parts,
			mentionPartType,
			plainText,
			{ start: plainText.length, end: plainText.length },
			{ id: '123' },
		);
		expect(newValue).toBe('Hello <@123>');
		const { parts: finalParts, plainText: finalPlainText } = parseValue(`${newValue} `, [mentionPartType]);
		expect(finalPlainText).toBe('Hello @123 ');
		expect(finalParts).toHaveLength(3);
	});

	test('Backspace behavior', () => {
		const { parts, plainText } = parseValue('Hello <@123> world', [mentionPartType]);
		expect(plainText).toBe('Hello @123 world');
		const [value1] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello @123 worl');
		expect(value1).toBe('Hello <@123> worl');
		const [value2] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello @12');
		expect(value2).toBe('Hello @12');
	});

	test('Multiple mentions', () => {
		const { parts, plainText } = parseValue('', [mentionPartType]);
		let value = generateValueWithAddedSuggestion(
			parts,
			mentionPartType,
			plainText,
			{ start: 0, end: 0 },
			{ id: '123' },
		);
		expect(value).toBe('<@123>');
		value = applyTextChange(value!, '@123 @ja');
		expect(value).toBe('<@123> @ja');
		const result = parseValue(value, [mentionPartType]);
		value = generateValueWithAddedSuggestion(
			result.parts,
			mentionPartType,
			result.plainText,
			{ start: result.plainText.length, end: result.plainText.length },
			{ id: '456' },
		);
		expect(value).toBe('<@123> <@456>');
		const final = parseValue(value!, [mentionPartType]);
		expect(final.plainText).toBe('@123 @456');
		expect(final.parts).toHaveLength(3);
	});
});

describe('generateValueFromPartsAndChangedText', () => {
	test('preserves mentions when appending plain text', () => {
		const { parts, plainText } = parseValue('Hi <@123>', [mentionPartType]);
		const [value] = generateValueFromPartsAndChangedText(parts, plainText, 'Hi @123!');
		expect(value).toBe('Hi <@123>!');
	});

	test('preserves mentions when prepending plain text', () => {
		const { parts, plainText } = parseValue('Hi <@123>', [mentionPartType]);
		const [value] = generateValueFromPartsAndChangedText(parts, plainText, 'Hey Hi @123');
		expect(value).toBe('Hey Hi <@123>');
	});

	test('preserves mentions when inserting text between parts', () => {
		const { parts, plainText } = parseValue('Hello <@123> world', [mentionPartType]);
		const [value] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello @123 beautiful world');
		expect(value).toBe('Hello <@123> beautiful world');
	});

	test('preserves mentions when deleting text outside the mention', () => {
		const { parts, plainText } = parseValue('Hello <@123> world', [mentionPartType]);
		const [value] = generateValueFromPartsAndChangedText(parts, plainText, 'Helo @123 world');
		expect(value).toBe('Helo <@123> world');
	});

	test('converts mention to plain text when mention body is edited', () => {
		const { parts, plainText } = parseValue('Hello <@123> world', [mentionPartType]);
		const [value] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello X world');
		expect(value).toBe('Hello X world');
	});

	test('handles clearing all text', () => {
		const { parts, plainText } = parseValue('Hello <@123>', [mentionPartType]);
		const [value] = generateValueFromPartsAndChangedText(parts, plainText, '');
		expect(value).toBe('');
	});

	test('handles no-op text change', () => {
		const { parts, plainText } = parseValue('Hello <@123>', [mentionPartType]);
		const [value] = generateValueFromPartsAndChangedText(parts, plainText, plainText);
		expect(value).toBe('Hello <@123>');
	});

	test('handles middle replacement without mentions', () => {
		const { parts, plainText } = parseValue('abcdef', [mentionPartType]);
		const [value] = generateValueFromPartsAndChangedText(parts, plainText, 'abXYef');
		expect(value).toBe('abXYef');
	});

	test('keeps multi-code-point emoji intact across edits', () => {
		const family = '👨‍👩‍👧‍👦';
		const skinTone = '👋🏻';
		expect(applyTextChange(`Hi ${family} `, `Hi ${family} there`)).toBe(`Hi ${family} there`);
		expect(applyTextChange(skinTone, `${skinTone} hi`)).toBe(`${skinTone} hi`);
		expect(applyTextChange(`👋 <@123>`, `👋👋 @123`)).toBe(`👋👋 <@123>`);
		expect(applyTextChange(`👋 <@123>`, `👋 @123!`)).toBe(`👋 <@123>!`);
	});
});

describe('getMentionPartSuggestionKeywords', () => {
	test('returns keyword after trigger', () => {
		const { parts, plainText } = parseValue('Hello @jo', [mentionPartType]);
		const keywords = getMentionPartSuggestionKeywords(
			parts,
			plainText,
			{ start: plainText.length, end: plainText.length },
			[mentionPartType],
		);
		expect(keywords['@']).toBe('jo');
	});

	test('allows spaces within allowedSpacesCount', () => {
		const { parts, plainText } = parseValue('Hello @john doe', [mentionPartType]);
		const keywords = getMentionPartSuggestionKeywords(
			parts,
			plainText,
			{ start: plainText.length, end: plainText.length },
			[mentionPartType],
		);
		expect(keywords['@']).toBe('john doe');
	});

	test('returns undefined for non-collapsed selection', () => {
		const { parts, plainText } = parseValue('Hello @jo', [mentionPartType]);
		const keywords = getMentionPartSuggestionKeywords(parts, plainText, { start: 6, end: 9 }, [mentionPartType]);
		expect(keywords['@']).toBeUndefined();
	});

	test('returns undefined when trigger has no leading whitespace', () => {
		const { parts, plainText } = parseValue('Hello@jo', [mentionPartType]);
		const keywords = getMentionPartSuggestionKeywords(
			parts,
			plainText,
			{ start: plainText.length, end: plainText.length },
			[mentionPartType],
		);
		expect(keywords['@']).toBeUndefined();
	});

	test('returns undefined when cursor is inside an existing mention', () => {
		const { parts, plainText } = parseValue('Hello <@123>', [mentionPartType]);
		const keywords = getMentionPartSuggestionKeywords(
			parts,
			plainText,
			{ start: plainText.length, end: plainText.length },
			[mentionPartType],
		);
		expect(keywords['@']).toBeUndefined();
	});
});

describe('generateValueWithAddedSuggestion', () => {
	test('inserts trailing space when insertSpaceAfterMention is enabled', () => {
		const mentionWithSpace: MentionPartType = {
			...mentionPartType,
			insertSpaceAfterMention: true,
		};
		const { parts, plainText } = parseValue('Hello @jo', [mentionWithSpace]);
		const value = generateValueWithAddedSuggestion(
			parts,
			mentionWithSpace,
			plainText,
			{ start: plainText.length, end: plainText.length },
			{ id: '1' },
		);
		expect(value).toBe('Hello <@1> ');
	});

	test('returns undefined when selection is outside parts', () => {
		const { parts, plainText } = parseValue('Hello', [mentionPartType]);
		const value = generateValueWithAddedSuggestion(
			parts,
			mentionPartType,
			plainText,
			{ start: 100, end: 100 },
			{ id: '1' },
		);
		expect(value).toBeUndefined();
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
					end: 10,
				},
			});
		});

		test('generateMentionPart with position offset', () => {
			const mention = {
				id: '123',
				original: '<@123>',
				trigger: '@',
			};
			const part = generateMentionPart(mentionPartType, mention, 5);
			expect(part).toEqual({
				text: '@123',
				position: {
					start: 5,
					end: 9,
				},
				partType: mentionPartType,
				data: mention,
			});
		});
	});

	describe('getValueFromParts', () => {
		test('should concatenate parts correctly', () => {
			const parts = [
				generatePlainTextPart('Hello '),
				generateMentionPart(mentionPartType, { id: '123', original: '<@123>', trigger: '@' }),
				generatePlainTextPart('!'),
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
				result: match,
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
				result: match,
			});
		});
	});

	describe('parseValue edge cases', () => {
		test('should handle multiple part types with no matches', () => {
			const hashtagPartType: PartType = {
				pattern: /#[a-z]+/g,
			};
			const result = parseValue('plain text', [hashtagPartType, mentionPartType]);
			expect(result.plainText).toBe('plain text');
			expect(result.parts).toHaveLength(1);
		});

		test('should handle regex pattern part type', () => {
			const urlPartType: PartType = {
				pattern: /https?:\/\/\S+/g,
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

		test('should route mismatched trigger matches to remaining part types', () => {
			const sharedPattern = /<(?<trigger>[@#])(?<id>\d+)>/g;
			const atMention: MentionPartType = {
				trigger: '@',
				pattern: sharedPattern,
				getLabel: (mention) => `@${mention.id}`,
			};
			const hashMention: MentionPartType = {
				trigger: '#',
				pattern: sharedPattern,
				getLabel: (mention) => `#${mention.id}`,
			};
			const result = parseValue('x <#9> y <@1>', [atMention, hashMention]);
			expect(result.plainText).toBe('x #9 y @1');
			expect(result.parts).toHaveLength(4);
			expect(result.parts[1].data?.trigger).toBe('#');
			expect(result.parts[3].data?.trigger).toBe('@');
		});
	});

	describe('Emoji handling', () => {
		test('should maintain emoji integrity when typing after it', () => {
			// Start with text containing emoji
			const { parts, plainText } = parseValue('Hello 👋 ', [mentionPartType]);
			expect(plainText).toBe('Hello 👋 ');

			const [value] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello 👋 world');
			expect(value).toBe('Hello 👋 world');

			expect(value.includes('👋')).toBeTruthy();
		});

		test('should correctly handle backspace with emoji', () => {
			// Start with text containing emoji
			const { parts, plainText } = parseValue('Hello 👋 world', [mentionPartType]);

			// Backspace one character after emoji
			const [value1] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello 👋 worl');
			expect(value1).toBe('Hello 👋 worl');

			// Verify emoji is still intact
			expect([...value1].length).toBe([...plainText].length - 1);

			// Backspace the emoji
			const [value2] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello world');
			expect(value2).toBe('Hello world');
		});

		test('should handle multiple emojis correctly', () => {
			// Start with text containing multiple emojis
			const { parts, plainText } = parseValue('Hello 👋 🌎', [mentionPartType]);

			// Add text between emojis
			const [value] = generateValueFromPartsAndChangedText(parts, plainText, 'Hello 👋 beautiful 🌎');
			expect(value).toBe('Hello 👋 beautiful 🌎');

			// Verify both emojis are intact
			const emojiCount = [...value].filter((char) => /\p{Emoji}/u.test(char)).length;
			expect(emojiCount).toBe(2);
		});
	});
});
