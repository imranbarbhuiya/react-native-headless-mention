import React, { type MutableRefObject, useMemo, useRef, useState } from 'react';
import { type NativeSyntheticEvent, Text, TextInput, type TextInputSelectionChangeEventData, View } from 'react-native';

import type { MentionInputProps, MentionPartType, Suggestion } from './lib/types';
import {
	generateValueFromPartsAndChangedText,
	generateValueWithAddedSuggestion,
	getMentionPartSuggestionKeywords,
	isMentionPartType,
	parseValue,
} from './lib/utils';

export function Input({
	value,
	onChange,
	partTypes = [],
	inputRef: propInputRef,
	containerStyle,
	onSelectionChange,
	...textInputProps
}: MentionInputProps) {
	const textInput = useRef<TextInput | null>(null);

	const [selection, setSelection] = useState({ start: 0, end: 0 });

	const { plainText, parts } = useMemo(() => parseValue(value, partTypes), [value, partTypes]);

	const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
		setSelection(event.nativeEvent.selection);

		onSelectionChange?.(event);
	};

	const onChangeInput = (changedText: string) => {
		onChange(generateValueFromPartsAndChangedText(parts, plainText, changedText));
	};

	const keywordByTrigger = useMemo(
		() => getMentionPartSuggestionKeywords(parts, plainText, selection, partTypes),
		[parts, plainText, selection, partTypes],
	);

	const onSuggestionPress = (mentionType: MentionPartType) => (suggestion: Suggestion) => {
		const newValue = generateValueWithAddedSuggestion(parts, mentionType, plainText, selection, suggestion);

		if (!newValue) return;

		onChange(newValue);
	};

	const handleTextInputRef = (ref: TextInput) => {
		textInput.current = ref;

		if (propInputRef) {
			if (typeof propInputRef === 'function') {
				propInputRef(ref);
			} else {
				(propInputRef as MutableRefObject<TextInput>).current = ref;
			}
		}
	};

	const renderMentionSuggestions = (mentionType: MentionPartType) => (
		<React.Fragment key={mentionType.trigger}>
			{mentionType.renderSuggestions?.({
				keyword: keywordByTrigger[mentionType.trigger],
				onSuggestionPress: onSuggestionPress(mentionType),
			})}
		</React.Fragment>
	);

	return (
		<View style={containerStyle}>
			{(
				partTypes.filter(
					(one) =>
						isMentionPartType(one) &&
						one.renderSuggestions &&
						(!one.renderPosition || one.renderPosition === 'top'),
				) as MentionPartType[]
			).map(renderMentionSuggestions)}
			<TextInput
				multiline
				{...textInputProps}
				ref={handleTextInputRef}
				onChangeText={onChangeInput}
				onSelectionChange={handleSelectionChange}
				selection={selection}
			>
				<Text>
					{parts.map(({ text, partType, data }, index) =>
						partType ? (
							<Text key={`${index}-${data?.trigger ?? 'pattern'}`} style={partType.textStyle}>
								{text}
							</Text>
						) : (
							<Text key={index}>{text}</Text>
						),
					)}
				</Text>
			</TextInput>
			{(
				partTypes.filter(
					(one) => isMentionPartType(one) && one.renderSuggestions && one.renderPosition === 'bottom',
				) as MentionPartType[]
			).map(renderMentionSuggestions)}
		</View>
	);
}
