import React, { type MutableRefObject, useRef } from 'react';
import { Text, TextInput } from 'react-native';

import type { MentionInputProps } from './lib/types';

export type * from './lib/types';
export * from './lib/utils';
export * from './lib/useMention';

export function Input({
	parts,
	value,
	inputRef: propInputRef,
	component: Component = TextInput,
	...textInputProps
}: MentionInputProps) {
	const textInput = useRef<TextInput | null>(null);

	const handleTextInputRef = (ref: TextInput) => {
		textInput.current = ref;

		if (propInputRef) {
			if (typeof propInputRef === 'function') propInputRef(ref);
			else (propInputRef as MutableRefObject<TextInput>).current = ref;
		}
	};

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
