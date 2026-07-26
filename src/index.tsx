import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { Text, TextInput } from 'react-native';

import type { MentionInputProps } from './lib/types';

export type * from './lib/types';
export * from './lib/useMention';
export * from './lib/utils';

export function Input({
	parts,
	value,
	inputRef: propInputRef,
	component: Component = TextInput,
	...textInputProps
}: MentionInputProps) {
	const textInput = useRef<TextInput | null>(null);

	// Kept stable, so the ref isn't detached and reattached, and left null in between, on every render
	const handleTextInputRef = useCallback(
		(ref: TextInput) => {
			textInput.current = ref;

			if (propInputRef) {
				if (typeof propInputRef === 'function') propInputRef(ref);
				else propInputRef.current = ref;
			}
		},
		[propInputRef],
	);

	// Emptying the text through the children leaves a multiline input at the height it had grown to,
	// since the native side keeps the size it last measured. Clearing it through the imperative
	// handle updates that measurement, which handing it an empty value on its own does not do.
	useLayoutEffect(() => {
		if (value === '') textInput.current?.clear();
	}, [value]);

	return (
		<Component multiline {...textInputProps} ref={handleTextInputRef} value={value}>
			{typeof value === 'string' ? null : (
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
			)}
		</Component>
	);
}
