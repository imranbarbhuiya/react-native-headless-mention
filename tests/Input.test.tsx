import { fireEvent, render, screen } from '@testing-library/react-native';
import { createRef, type Ref, useEffect, useImperativeHandle } from 'react';
import { Text, TextInput } from 'react-native';

import { Input } from '../src/index';
import { parseValue } from '../src/lib/utils';

import type { MentionInputProps, MentionPartType, PartType } from '../src/lib/types';

const mentionPartType: MentionPartType = {
	trigger: '@',
	pattern: /<(?<trigger>@)(?<id>\d+)>/g,
	getLabel: (mention) => `@${mention.id}`,
	textStyle: { fontWeight: 'bold' },
};

const boldPartType: PartType = {
	pattern: /\*(?<text>\S(?:.*?\S)?)\*/g,
	textStyle: { fontWeight: '700' },
};

const partTypes: PartType[] = [mentionPartType, boldPartType];

const CustomInput = (props: { testID?: string }) => <Text {...props}>custom</Text>;

const clear = jest.fn();
const mount = jest.fn();

// Stands in for a TextInput, to watch what the Input does with the imperative handle
const ClearableInput = ({ ref, ...props }: { ref?: Ref<{ clear: () => void }>; testID?: string }) => {
	useImperativeHandle(ref, () => ({ clear }), []);
	useEffect(() => mount(), []);

	return <Text {...props}>clearable</Text>;
};

/**
 * Builds the props `useMention` would hand over for a given value.
 *
 * @param value - the raw value to parse
 * @param overrides - props to add or replace
 */
const inputProps = (value: string, overrides: Partial<MentionInputProps> = {}): MentionInputProps => ({
	parts: parseValue(value, partTypes).parts,
	selection: { start: 0, end: 0 },
	onChangeText: jest.fn(),
	onSelectionChange: jest.fn(),
	testID: 'input',
	...overrides,
});

describe('Input', () => {
	test('renders the plain text and the mention label', async () => {
		await render(<Input {...inputProps('Hello <@1> world')} />);

		expect(screen.getByText('Hello ')).toBeTruthy();
		expect(screen.getByText('@1')).toBeTruthy();
		expect(screen.getByText(' world')).toBeTruthy();
	});

	test('styles a mention part with its textStyle', async () => {
		await render(<Input {...inputProps('Hello <@1>')} />);

		expect(screen.getByText('@1').props.style).toEqual(mentionPartType.textStyle);
	});

	test('styles a pattern part with its textStyle', async () => {
		await render(<Input {...inputProps('Hello *world*')} />);

		expect(screen.getByText('*world*').props.style).toEqual(boldPartType.textStyle);
	});

	test('leaves plain text unstyled', async () => {
		await render(<Input {...inputProps('Hello <@1>')} />);

		expect(screen.getByText('Hello ').props.style).toBeUndefined();
	});

	test('is multiline by default and forwards TextInput props', async () => {
		await render(<Input {...inputProps('Hello', { placeholder: 'Say something' })} />);

		const input = screen.getByTestId('input');

		expect(input.props.multiline).toBe(true);
		expect(input.props.placeholder).toBe('Say something');
	});

	test('lets multiline be overridden', async () => {
		await render(<Input {...inputProps('Hello', { multiline: false })} />);

		expect(screen.getByTestId('input').props.multiline).toBe(false);
	});

	test('forwards the selection', async () => {
		await render(<Input {...inputProps('Hello', { selection: { start: 2, end: 4 } })} />);

		expect(screen.getByTestId('input').props.selection).toEqual({ start: 2, end: 4 });
	});

	test('calls onChangeText when the text changes', async () => {
		const onChangeText = jest.fn();
		await render(<Input {...inputProps('Hello', { onChangeText })} />);

		await fireEvent.changeText(screen.getByTestId('input'), 'Hello @');

		expect(onChangeText).toHaveBeenCalledWith('Hello @');
	});

	test('calls onSelectionChange when the selection changes', async () => {
		const onSelectionChange = jest.fn();
		await render(<Input {...inputProps('Hello', { onSelectionChange })} />);

		await fireEvent(screen.getByTestId('input'), 'selectionChange', {
			nativeEvent: { selection: { start: 3, end: 3 } },
		});

		expect(onSelectionChange).toHaveBeenCalled();
	});

	test('renders an empty controlled value instead of the parts', async () => {
		await render(<Input {...inputProps('Hello', { value: '' })} />);

		const input = screen.getByTestId('input');

		expect(input.props.value).toBe('');
		expect(screen.queryByText('Hello')).toBeNull();
	});

	test('forwards an object inputRef', async () => {
		const ref = createRef<TextInput>();
		await render(<Input {...inputProps('Hello', { inputRef: ref })} />);

		expect(ref.current).not.toBeNull();
	});

	test('forwards a callback inputRef', async () => {
		const inputRef = jest.fn();
		await render(<Input {...inputProps('Hello', { inputRef })} />);

		expect(inputRef).toHaveBeenCalled();
	});

	describe('resetting the height once the text is cleared', () => {
		beforeEach(() => {
			clear.mockClear();
			mount.mockClear();
		});

		// Remounting the input is what used to make it lose the keyboard and jump on send
		test('does not remount the input when the value is emptied', async () => {
			const ref = createRef<TextInput>();
			const { rerender } = await render(
				<Input {...inputProps('Hello', { component: ClearableInput, inputRef: ref })} />,
			);
			const instance = ref.current;

			await rerender(<Input {...inputProps('', { component: ClearableInput, inputRef: ref, value: '' })} />);
			await rerender(<Input {...inputProps('Hi', { component: ClearableInput, inputRef: ref })} />);

			expect(mount).toHaveBeenCalledTimes(1);
			expect(ref.current).toBe(instance);
		});

		test('clears the native input when the value is emptied', async () => {
			const { rerender } = await render(<Input {...inputProps('Hello', { component: ClearableInput })} />);

			expect(clear).not.toHaveBeenCalled();

			await rerender(<Input {...inputProps('', { component: ClearableInput, value: '' })} />);

			expect(clear).toHaveBeenCalledTimes(1);
		});

		test('does not clear the native input while there is text', async () => {
			const { rerender } = await render(<Input {...inputProps('Hello', { component: ClearableInput })} />);

			await rerender(<Input {...inputProps('Hello there', { component: ClearableInput })} />);

			expect(clear).not.toHaveBeenCalled();
		});

		test('does not clear the native input again once the text comes back', async () => {
			const { rerender } = await render(<Input {...inputProps('Hello', { component: ClearableInput })} />);
			await rerender(<Input {...inputProps('', { component: ClearableInput, value: '' })} />);
			await rerender(<Input {...inputProps('Hi', { component: ClearableInput })} />);

			expect(clear).toHaveBeenCalledTimes(1);
		});
	});

	test('renders a custom component instead of TextInput', async () => {
		await render(<Input {...inputProps('Hello', { component: CustomInput, testID: 'custom' })} />);

		expect(screen.getByTestId('custom')).toBeTruthy();
	});
});
