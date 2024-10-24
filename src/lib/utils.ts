import { diffChars } from 'diff';

import type { CharactersDiffChange, MentionData, MentionPartType, Part, PartType, Position, Suggestion } from './types';

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

const getPartsInterval = (parts: Part[], cursor: number, count: number): Part[] => {
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
			generatePlainTextPart(currentPart.text.slice(cursor - currentPart.position.start, newCursor)),
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

const getMentionPartSuggestionKeywords = (
	parts: Part[],
	plainText: string,
	selection: Position,
	partTypes: PartType[],
): { [trigger: string]: string | undefined } => {
	const keywordByTrigger: { [trigger: string]: string | undefined } = {};

	for (const { trigger, allowedSpacesCount = 1 } of partTypes.filter(isMentionPartType)) {
		keywordByTrigger[trigger] = undefined;

		if (selection.end !== selection.start) continue;

		const part = parts.find((one) => selection.end > one.position.start && selection.end <= one.position.end);

		if (!part || part.data) continue;

		const triggerIndex = plainText.lastIndexOf(trigger, selection.end);

		if (
			triggerIndex === -1 ||
			triggerIndex < part.position.start ||
			(triggerIndex > 0 && !/\s/gi.test(plainText[triggerIndex - 1]))
		)
			continue;

		let spacesCount = 0;
		for (let cursor = selection.end - 1; cursor >= triggerIndex; cursor -= 1) {
			if (plainText[cursor] === '\n') continue;

			if (plainText[cursor] === ' ') {
				spacesCount += 1;

				if (spacesCount > allowedSpacesCount) continue;
			}
		}

		keywordByTrigger[trigger] = plainText.slice(triggerIndex + 1, selection.end);
	}

	return keywordByTrigger;
};

const generateValueFromPartsAndChangedText = (
	parts: Part[],
	originalText: string,
	changedText: string,
): [string, Part[]] => {
	const changes = diffChars(originalText, changedText) as CharactersDiffChange[];
	let newParts: Part[] = [];

	let cursor = 0;

	for (const change of changes) {
		switch (true) {
			case change.removed: {
				cursor += change.count;

				break;
			}

			case change.added: {
				newParts.push(generatePlainTextPart(change.value));
				break;
			}

			default: {
				if (change.count !== 0) {
					newParts = newParts.concat(getPartsInterval(parts, cursor, change.count));
					cursor += change.count;
				}

				break;
			}
		}
	}

	return [getValueFromParts(newParts), newParts];
};

const generateValueWithAddedSuggestion = (
	parts: Part[],
	mentionType: MentionPartType,
	plainText: string,
	selection: Position,
	suggestion: Suggestion,
): string | undefined => {
	const currentPartIndex = parts.findIndex(
		(one) => selection.end >= one.position.start && selection.end <= one.position.end,
	);
	const currentPart = parts[currentPartIndex];

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!currentPart) return;

	const triggerPartIndex = currentPart.text.lastIndexOf(
		mentionType.trigger,
		selection.end - currentPart.position.start,
	);

	const newMentionPartPosition: Position = {
		start: triggerPartIndex,
		end: selection.end - currentPart.position.start,
	};

	const isInsertSpaceToNextPart =
		mentionType.insertSpaceAfterMention &&
		(plainText.length === selection.end ||
			parts[currentPartIndex]?.text.startsWith('\n', newMentionPartPosition.end));

	return getValueFromParts([
		...parts.slice(0, currentPartIndex),

		generatePlainTextPart(currentPart.text.slice(0, Math.max(0, newMentionPartPosition.start))),
		generateMentionPart(mentionType, {
			original: getMentionValue(mentionType.trigger, suggestion),
			trigger: mentionType.trigger,
			...suggestion,
		}),

		generatePlainTextPart(
			`${isInsertSpaceToNextPart ? ' ' : ''}${currentPart.text.slice(Math.max(0, newMentionPartPosition.end))}`,
		),

		...parts.slice(currentPartIndex + 1),
	]);
};

const generateRegexResultPart = (partType: PartType, result: RegExpMatchArray, positionOffset = 0): Part => ({
	text: result[0],
	position: {
		start: positionOffset,
		end: positionOffset + result[0].length,
	},
	partType,
});

const getMentionDataFromRegExpMatchArray = (arr: RegExpMatchArray): MentionData => {
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
	isMentionPartType,
	getMentionPartSuggestionKeywords,
	generateValueFromPartsAndChangedText,
	generateValueWithAddedSuggestion,
	generatePlainTextPart,
	generateMentionPart,
	getMentionValue,
	parseValue,
	getValueFromParts,
};
