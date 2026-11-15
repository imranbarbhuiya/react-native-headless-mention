import { diffChars } from 'diff';

import type {
	CharactersDiffChange,
	MentionData,
	MentionPartType,
	MentionSuggestionsProps,
	Part,
	PartType,
	Position,
	Suggestion,
} from './types';

const isMentionPartType = (partType: PartType): partType is MentionPartType =>
	Boolean('trigger' in partType && partType.trigger);

const getPartIndexByCursor = (parts: Part[], cursor: number, isIncludeEnd?: boolean) =>
	parts.findIndex((one) =>
		cursor >= one.position.start && isIncludeEnd ? cursor <= one.position.end : cursor < one.position.end,
	);

/**
 * Method for generating part for plain text
 *
 * @param text - plain text that will be added to the part
 * @param positionOffset - position offset from the very beginning of text
 */
const generatePlainTextPart = (text: string, positionOffset = 0): Part => ({
	text,
	position: {
		start: positionOffset,
		end: positionOffset + text.length,
	},
});

/**
 * Method for generating part for mention
 *
 * @param mentionPartType
 * @param mention - mention data
 * @param positionOffset - position offset from the very beginning of text
 */
const generateMentionPart = (mentionPartType: MentionPartType, mention: MentionData, positionOffset = 0): Part => {
	const text = mentionPartType.getLabel(mention);

	return {
		text,
		position: {
			start: positionOffset,
			end: positionOffset + text.length,
		},
		partType: mentionPartType,
		data: mention,
	};
};

/**
 * Function for generation value from parts array
 *
 * @param parts
 */
const getValueFromParts = (parts: Part[]) => parts.map((item) => (item.data ? item.data.original : item.text)).join('');

/**
 * Method for generation mention value that accepts mention regex
 *
 * @param trigger
 * @param suggestion
 */
const getMentionValue = (trigger: string, suggestion: Suggestion) => `<${trigger}${suggestion.id}>`;

export const getPartsInterval = (parts: Part[], cursor: number, count: number): Part[] => {
	const newCursor = cursor + count;

	const currentPartIndex = getPartIndexByCursor(parts, cursor);
	const currentPart = parts[currentPartIndex];

	const newPartIndex = getPartIndexByCursor(parts, newCursor, true);
	const newPart = parts[newPartIndex];

	let partsInterval: Part[] = [];

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!currentPart || !newPart) return partsInterval;
	if (currentPart.position.start === cursor && currentPart.position.end <= newCursor) partsInterval.push(currentPart);
	else {
		partsInterval.push(
			generatePlainTextPart(
				currentPart.text.slice(cursor - currentPart.position.start, newCursor - currentPart.position.start),
			),
		);
	}

	if (newPartIndex > currentPartIndex) {
		partsInterval = partsInterval.concat(parts.slice(currentPartIndex + 1, newPartIndex));

		if (newPart.position.end === newCursor && newPart.position.start >= cursor) partsInterval.push(newPart);
		else {
			partsInterval.push(
				generatePlainTextPart(newPart.text.slice(0, Math.max(0, newCursor - newPart.position.start))),
			);
		}
	}

	return partsInterval;
};

/**
 * Method for finding the keyword being typed for a mention part type
 *
 * There's only a keyword for a collapsed selection right after a trigger that starts the text or
 * follows whitespace, with no new line in between and no more spaces than `allowedSpacesCount`.
 * The trigger has to end before the cursor, so a cursor placed right in front of one finds nothing.
 *
 * @param parts
 * @param plainText
 * @param selection
 * @param mentionType
 * @returns the index of the part holding the keyword and the position of its trigger in the plain text
 */
const findKeyword = (
	parts: Part[],
	plainText: string,
	selection: Position,
	{ trigger, allowedSpacesCount = 1 }: MentionPartType,
): { partIndex: number; triggerIndex: number } | undefined => {
	if (selection.end !== selection.start) return;

	const partIndex = parts.findIndex((one) => selection.end > one.position.start && selection.end <= one.position.end);
	const part = parts[partIndex];

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!part || part.data) return;

	const triggerOffset = plainText.slice(part.position.start, selection.end).lastIndexOf(trigger);

	if (triggerOffset === -1) return;

	const triggerIndex = part.position.start + triggerOffset;

	if (triggerIndex > 0 && !/\s/.test(plainText[triggerIndex - 1])) return;

	const typed = plainText.slice(triggerIndex + trigger.length, selection.end);

	// A new line always ends the keyword, and so does one space too many
	if (typed.includes('\n') || typed.split(' ').length - 1 > allowedSpacesCount) return;

	return { partIndex, triggerIndex };
};

const getMentionPartSuggestionKeywords = (
	parts: Part[],
	plainText: string,
	selection: Position,
	partTypes: PartType[],
): { [trigger: string]: string | undefined } => {
	const keywordByTrigger: { [trigger: string]: string | undefined } = {};

	for (const mentionType of partTypes.filter(isMentionPartType)) {
		const keyword = findKeyword(parts, plainText, selection, mentionType);

		keywordByTrigger[mentionType.trigger] = keyword
			? plainText.slice(keyword.triggerIndex + mentionType.trigger.length, selection.end)
			: undefined;
	}

	return keywordByTrigger;
};

/**
 * Method for diffing the text of an edit
 *
 * A keystroke, a backspace or a paste only ever adds or removes one run of characters, which the
 * common prefix and suffix already describe. Diffing those character by character means tokenizing
 * the whole value on every edit, so it's only done for the replacements the affixes can't describe,
 * where the character diff is what keeps the mentions in between the changed runs intact.
 *
 * @param originalText
 * @param changedText
 */
const getTextChanges = (originalText: string, changedText: string): CharactersDiffChange[] => {
	const maxAffixLength = Math.min(originalText.length, changedText.length);

	let prefixLength = 0;
	while (prefixLength < maxAffixLength && originalText[prefixLength] === changedText[prefixLength]) prefixLength += 1;

	let suffixLength = 0;
	while (
		suffixLength < maxAffixLength - prefixLength &&
		originalText[originalText.length - 1 - suffixLength] === changedText[changedText.length - 1 - suffixLength]
	)
		suffixLength += 1;

	const removed = originalText.slice(prefixLength, originalText.length - suffixLength);
	const added = changedText.slice(prefixLength, changedText.length - suffixLength);

	if (removed.length > 0 && added.length > 0) return diffChars(originalText, changedText);

	const changes: CharactersDiffChange[] = [];

	if (prefixLength > 0)
		changes.push({ value: originalText.slice(0, prefixLength), count: prefixLength, added: false, removed: false });

	if (removed.length > 0) changes.push({ value: removed, count: removed.length, added: false, removed: true });

	if (added.length > 0) changes.push({ value: added, count: added.length, added: true, removed: false });

	if (suffixLength > 0) {
		changes.push({
			value: originalText.slice(originalText.length - suffixLength),
			count: suffixLength,
			added: false,
			removed: false,
		});
	}

	return changes;
};

const generateValueFromPartsAndChangedText = (
	parts: Part[],
	originalText: string,
	changedText: string,
): [string, Part[]] => {
	const changes = getTextChanges(originalText, changedText);
	let newParts: Part[] = [];

	let cursor = 0;

	for (const change of changes) {
		switch (true) {
			case change.removed: {
				cursor += change.value.length;

				break;
			}

			case change.added: {
				newParts.push(generatePlainTextPart(change.value));
				break;
			}

			default: {
				if (change.value.length !== 0) {
					newParts = newParts.concat(getPartsInterval(parts, cursor, change.value.length));
					cursor += change.value.length;
				}

				break;
			}
		}
	}

	return [getValueFromParts(newParts), newParts];
};

/**
 * Method for replacing the keyword being typed with a mention of the picked suggestion
 *
 * @returns the new value, or `undefined` when there's no keyword at the selection, since there's no
 * trigger to replace
 */
const generateValueWithAddedSuggestion = (
	parts: Part[],
	mentionType: MentionPartType,
	plainText: string,
	selection: Position,
	suggestion: Suggestion,
): string | undefined => {
	const keyword = findKeyword(parts, plainText, selection, mentionType);

	if (!keyword) return;

	const { partIndex, triggerIndex } = keyword;
	const currentPart = parts[partIndex];

	const isInsertSpaceToNextPart =
		mentionType.insertSpaceAfterMention &&
		(plainText.length === selection.end || plainText.startsWith('\n', selection.end));

	return getValueFromParts([
		...parts.slice(0, partIndex),

		generatePlainTextPart(currentPart.text.slice(0, triggerIndex - currentPart.position.start)),
		generateMentionPart(mentionType, {
			original: getMentionValue(mentionType.trigger, suggestion),
			trigger: mentionType.trigger,
			...suggestion,
		}),

		generatePlainTextPart(
			`${isInsertSpaceToNextPart ? ' ' : ''}${currentPart.text.slice(selection.end - currentPart.position.start)}`,
		),

		...parts.slice(partIndex + 1),
	]);
};

/**
 * Method for generating the suggestions state of every mention part type
 *
 * @param parts
 * @param plainText
 * @param selection
 * @param partTypes
 * @param onChange - called with the new value when a suggestion is applied
 * @returns the keyword being typed and the press handler, keyed by trigger
 */
const getSuggestions = (
	parts: Part[],
	plainText: string,
	selection: Position,
	partTypes: PartType[],
	onChange: (value: string, parts: Part[]) => any,
): { [trigger: string]: MentionSuggestionsProps } => {
	const keywordByTrigger = getMentionPartSuggestionKeywords(parts, plainText, selection, partTypes);

	const suggestions: { [trigger: string]: MentionSuggestionsProps } = {};

	for (const mentionType of partTypes.filter(isMentionPartType)) {
		const keyword = keywordByTrigger[mentionType.trigger];

		suggestions[mentionType.trigger] = {
			keyword,
			onSuggestionPress: (suggestion) => {
				const newValue = generateValueWithAddedSuggestion(parts, mentionType, plainText, selection, suggestion);

				if (!newValue) return;

				onChange(newValue, parts);
			},
		};
	}

	return suggestions;
};

const generateRegexResultPart = (partType: PartType, result: RegExpMatchArray, positionOffset = 0): Part => ({
	text: result[0],
	position: {
		start: positionOffset,
		end: positionOffset + result[0].length,
	},
	partType,
});

export const getMentionDataFromRegExpMatchArray = (arr: RegExpMatchArray): MentionData => {
	const original = arr[0];
	const groups = arr.groups;

	const trigger = groups?.trigger ?? arr[1];
	const id = groups?.id ?? arr[2];

	return {
		id,
		original,
		result: arr,
		trigger,
	};
};

const parseValue = (value: string, partTypes: PartType[], positionOffset = 0): { parts: Part[]; plainText: string } => {
	let plainText = '';
	let parts: Part[] = [];

	if (partTypes.length === 0) {
		plainText += value;
		parts.push(generatePlainTextPart(value, positionOffset));
	} else {
		const [partType, ...restPartTypes] = partTypes;

		const regex = partType.pattern;

		const matches: RegExpMatchArray[] = Array.from(value.matchAll(regex));

		if (matches.length === 0) return parseValue(value, restPartTypes, positionOffset);

		if (matches[0].index !== 0) {
			const text = value.slice(0, Math.max(0, matches[0].index!));

			const plainTextAndParts = parseValue(text, restPartTypes, positionOffset);
			parts = parts.concat(plainTextAndParts.parts);
			plainText += plainTextAndParts.plainText;
		}

		for (let i = 0; i < matches.length; i++) {
			const result = matches[i];

			if (isMentionPartType(partType)) {
				const mentionData = getMentionDataFromRegExpMatchArray(result);

				if (mentionData.trigger === partType.trigger) {
					const part = generateMentionPart(partType, mentionData, positionOffset + plainText.length);

					parts.push(part);

					plainText += part.text;
				} else {
					const plainTextAndParts = parseValue(
						mentionData.original,
						restPartTypes,
						positionOffset + plainText.length,
					);
					parts = parts.concat(plainTextAndParts.parts);
					plainText += plainTextAndParts.plainText;
				}
			} else {
				const part = generateRegexResultPart(partType, result, positionOffset + plainText.length);

				parts.push(part);

				plainText += part.text;
			}

			if (result.index! + result[0].length !== value.length) {
				const isLastResult = i === matches.length - 1;

				const text = value.slice(
					result.index! + result[0].length,
					isLastResult ? undefined : matches[i + 1].index,
				);

				const plainTextAndParts = parseValue(text, restPartTypes, positionOffset + plainText.length);
				parts = parts.concat(plainTextAndParts.parts);
				plainText += plainTextAndParts.plainText;
			}
		}
	}

	return {
		plainText,
		parts,
	};
};

export {
	generateMentionPart,
	generatePlainTextPart,
	generateValueFromPartsAndChangedText,
	generateValueWithAddedSuggestion,
	getMentionPartSuggestionKeywords,
	getMentionValue,
	getSuggestions,
	getValueFromParts,
	isMentionPartType,
	parseValue,
};
