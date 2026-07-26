import { useCallback, useMemo, useRef, useState } from 'react';

import { generateValueFromPartsAndChangedText, getSuggestions, parseValue } from './utils';

import type { UseMentionOptions, UseMentionResult } from './types';
import type { TextInputSelectionChangeEvent } from 'react-native';

/**
 * Hook holding all the mention state.
 *
 * It returns the props to spread on the `Input` and, for every mention part type, the keyword being
 * typed along with the handler to apply a suggestion, so the suggestions can be rendered anywhere.
 *
 * @param options - value, change handler and part types
 * @returns the input props, the suggestions by trigger and the parsed value
 */
export function useMention({
	value,
	onChange,
	partTypes = [],
	onSelectionChange,
}: UseMentionOptions): UseMentionResult {
	const [selection, setSelection] = useState({ start: 0, end: 0 });

	const { plainText, parts } = useMemo(() => parseValue(value, partTypes), [value, partTypes]);

	const prevPlainTextRef = useRef(plainText);
	const collapseToControlledEmptyRef = useRef(false);
	if (prevPlainTextRef.current.length > 0 && plainText.length === 0) collapseToControlledEmptyRef.current = true;

	if (plainText.length > 0) collapseToControlledEmptyRef.current = false;

	prevPlainTextRef.current = plainText;
	const useControlledEmpty = plainText.length === 0 && collapseToControlledEmptyRef.current;

	const handleSelectionChange = useCallback(
		(event: TextInputSelectionChangeEvent) => {
			const { start, end } = event.nativeEvent.selection;

			setSelection((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));

			onSelectionChange?.(event);
		},
		[onSelectionChange],
	);

	const handleChangeText = useCallback(
		(changedText: string) => {
			onChange(...generateValueFromPartsAndChangedText(parts, plainText, changedText));
		},
		[onChange, parts, plainText],
	);

	const suggestions = useMemo(
		() => getSuggestions(parts, plainText, selection, partTypes, onChange),
		[parts, plainText, selection, partTypes, onChange],
	);

	const inputProps = useMemo(
		() => ({
			parts,
			selection,
			onChangeText: handleChangeText,
			onSelectionChange: handleSelectionChange,
			...(useControlledEmpty ? { value: '' } : {}),
		}),
		[parts, selection, handleChangeText, handleSelectionChange, useControlledEmpty],
	);

	return {
		inputProps,
		suggestions,
		parts,
		plainText,
	};
}
