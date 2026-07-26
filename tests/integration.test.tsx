import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Input, useMention } from '../src/index';

import type { MentionPartType, PartType } from '../src/lib/types';

const users = [
	{ id: '1', name: 'Parbez' },
	{ id: '2', name: 'Voxelli' },
];

const mentionPartType: MentionPartType = {
	trigger: '@',
	pattern: /<(?<trigger>@)(?<id>\d+)>/g,
	getLabel: (mention) => `@${users.find((one) => one.id === mention.id)?.name ?? mention.id}`,
	textStyle: { fontWeight: 'bold' },
};

const partTypes: PartType[] = [mentionPartType];

const Screen = ({ onValueChange }: { onValueChange?: (value: string) => void }) => {
	const [value, setValue] = useState('');

	const { inputProps, suggestions } = useMention({
		value,
		onChange: (next) => {
			setValue(next);
			onValueChange?.(next);
		},
		partTypes,
	});

	const { keyword, onSuggestionPress } = suggestions['@'];

	return (
		<View>
			{/* Rendered outside of the Input, which is the whole point of the hook */}
			<View testID="suggestions">
				{keyword === undefined
					? null
					: users
							.filter((one) => one.name.toLowerCase().includes(keyword.toLowerCase()))
							.map((one) => (
								<Pressable key={one.id} onPress={() => onSuggestionPress(one)} testID={`user-${one.id}`}>
									<Text>{one.name}</Text>
								</Pressable>
							))}
			</View>

			<Input {...inputProps} testID="input" />
		</View>
	);
};

const typeAndPlaceCursor = async (text: string) => {
	await fireEvent.changeText(screen.getByTestId('input'), text);
	await fireEvent(screen.getByTestId('input'), 'selectionChange', {
		nativeEvent: { selection: { start: text.length, end: text.length } },
	});
};

describe('useMention with Input', () => {
	test('shows no suggestions until a trigger is typed', async () => {
		await render(<Screen />);

		await typeAndPlaceCursor('Hello');

		expect(screen.queryByTestId('user-1')).toBeNull();
	});

	test('filters the suggestions by the typed keyword', async () => {
		await render(<Screen />);

		await typeAndPlaceCursor('Hello @');

		expect(screen.getByTestId('user-1')).toBeTruthy();
		expect(screen.getByTestId('user-2')).toBeTruthy();

		await typeAndPlaceCursor('Hello @par');

		expect(screen.getByTestId('user-1')).toBeTruthy();
		expect(screen.queryByTestId('user-2')).toBeNull();
	});

	test('applies a suggestion pressed outside the input and renders its label', async () => {
		const onValueChange = jest.fn();
		await render(<Screen onValueChange={onValueChange} />);

		await typeAndPlaceCursor('Hello @par');
		await fireEvent.press(screen.getByTestId('user-1'));

		expect(onValueChange).toHaveBeenLastCalledWith('Hello <@1>');
		expect(screen.getByText('@Parbez')).toBeTruthy();
		expect(screen.getByText('@Parbez').props.style).toEqual(mentionPartType.textStyle);
	});

	test('hides the suggestions once the mention is applied', async () => {
		await render(<Screen />);

		await typeAndPlaceCursor('Hello @par');
		await fireEvent.press(screen.getByTestId('user-1'));

		expect(screen.queryByTestId('user-1')).toBeNull();
	});

	test('keeps the mention whole while typing after it', async () => {
		const onValueChange = jest.fn();
		await render(<Screen onValueChange={onValueChange} />);

		await typeAndPlaceCursor('Hello @par');
		await fireEvent.press(screen.getByTestId('user-1'));
		await typeAndPlaceCursor('Hello @Parbez!');

		expect(onValueChange).toHaveBeenLastCalledWith('Hello <@1>!');
	});
});
