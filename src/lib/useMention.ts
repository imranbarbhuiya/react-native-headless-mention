import { useCallback, useMemo, useRef, useState } from 'react';

import { generateValueFromPartsAndChangedText, getSuggestions, parseValue } from './utils';

import type { Position, UseMentionOptions, UseMentionResult } from './types';
import type { TextInputSelectionChangeEvent } from 'react-native';

const mentionSelectionHandler = Symbol('mentionSelectionHandler');

type MentionSetSelection = ((selection: Position) => void) & {
	onHookSelectionChange?: (event: TextInputSelectionChangeEvent) => void;
};

type MentionSelectionHandler = ((event: TextInputSelectionChangeEvent) => void) & {
	[mentionSelectionHandler]?: true;
};

export function dispatchMentionSelectionChange(
	setSelection: (selection: Position) => void,
	onSelectionChange: ((event: TextInputSelectionChangeEvent) => void) | undefined,
	event: TextInputSelectionChangeEvent,
) {
	const { start, end } = event.nativeEvent.selection;
	setSelection({ start, end });
	(setSelection as MentionSetSelection).onHookSelectionChange?.(event);
	if (onSelectionChange && !(mentionSelectionHandler in onSelectionChange)) onSelectionChange(event);
}

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
	const [selection, setSelectionState] = useState({ start: 0, end: 0 });

	const onSelectionChangeRef = useRef(onSelectionChange);
	onSelectionChangeRef.current = onSelectionChange;

	const setSelection = useMemo(() => {
		const update: MentionSetSelection = (next) => {
			setSelectionState((prev) =>
				prev.start === next.start && prev.end === next.end ? prev : { start: next.start, end: next.end },
			);
		};

		update.onHookSelectionChange = (event) => {
			onSelectionChangeRef.current?.(event);
		};

		return update;
	}, []);

	const { plainText, parts } = useMemo(() => parseValue(value, partTypes), [value, partTypes]);

	const prevPlainTextRef = useRef(plainText);
	const collapseToControlledEmptyRef = useRef(false);
	if (prevPlainTextRef.current.length > 0 && plainText.length === 0) collapseToControlledEmptyRef.current = true;

	if (plainText.length > 0) collapseToControlledEmptyRef.current = false;

	prevPlainTextRef.current = plainText;
	const useControlledEmpty = plainText.length === 0 && collapseToControlledEmptyRef.current;

	const handleSelectionChange = useMemo(() => {
		const handler: MentionSelectionHandler = (event) => {
			const { start, end } = event.nativeEvent.selection;

			setSelection({ start, end });
			onSelectionChangeRef.current?.(event);
		};

		handler[mentionSelectionHandler] = true;

		return handler;
	}, [setSelection]);

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
			setSelection,
			onChangeText: handleChangeText,
			onSelectionChange: handleSelectionChange,
			...(useControlledEmpty ? { value: '' } : {}),
		}),
		[parts, selection, setSelection, handleChangeText, handleSelectionChange, useControlledEmpty],
	);

	return {
		inputProps,
		setSelection,
		suggestions,
		parts,
		plainText,
	};
}
