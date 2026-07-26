import { act, renderHook } from '@testing-library/react-native';

import { useMention } from '../src/lib/useMention';

import type { MentionPartType, PartType, UseMentionOptions } from '../src/lib/types';
import type { TextInputSelectionChangeEvent } from 'react-native';

const mentionPartType: MentionPartType = {
	trigger: '@',
	pattern: /<(?<trigger>@)(?<id>\d+)>/g,
	getLabel: (mention) => `@${mention.id}`,
	textStyle: { fontWeight: 'bold' },
};

const partTypes: PartType[] = [mentionPartType];

const selectionChangeEvent = (start: number, end: number) =>
	({ nativeEvent: { selection: { start, end } } }) as TextInputSelectionChangeEvent;

const renderUseMention = async (options: UseMentionOptions) => {
	let renderCount = 0;

	const utils = await renderHook(
		(props: UseMentionOptions) => {
			renderCount += 1;

			return useMention(props);
		},
		{ initialProps: options },
	);

	return {
		...utils,
		get renderCount() {
			return renderCount;
		},
		selectionChange: async (start: number, end: number) => {
			await act(async () => {
				utils.result.current.inputProps.onSelectionChange(selectionChangeEvent(start, end));
			});
		},
	};
};

describe('useMention', () => {
	test('parses the value into parts and plain text', async () => {
		const { result } = await renderUseMention({ value: 'Hello <@1>', onChange: jest.fn(), partTypes });

		expect(result.current.plainText).toBe('Hello @1');
		expect(result.current.parts.map((part) => part.text)).toEqual(['Hello ', '@1']);
		expect(result.current.inputProps.parts).toBe(result.current.parts);
	});

	test('starts with a collapsed selection at the beginning', async () => {
		const { result } = await renderUseMention({ value: 'Hello', onChange: jest.fn(), partTypes });

		expect(result.current.inputProps.selection).toEqual({ start: 0, end: 0 });
	});

	test('defaults partTypes to an empty list', async () => {
		const { result } = await renderUseMention({ value: 'Hello', onChange: jest.fn() });

		expect(result.current.plainText).toBe('Hello');
		expect(result.current.suggestions).toEqual({});
	});

	test('onChangeText calls onChange with the new value and its parts', async () => {
		const onChange = jest.fn();
		const { result } = await renderUseMention({ value: 'Hello', onChange, partTypes });

		await act(async () => {
			result.current.inputProps.onChangeText('Hello @');
		});

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0][0]).toBe('Hello @');
		expect(onChange.mock.calls[0][1].map((part: { text: string }) => part.text)).toEqual(['Hello', ' @']);
	});

	test('onChangeText keeps an untouched mention in the value', async () => {
		const onChange = jest.fn();
		const { result } = await renderUseMention({ value: 'Hello <@1>', onChange, partTypes });

		await act(async () => {
			result.current.inputProps.onChangeText('Hello @1!');
		});

		expect(onChange.mock.calls[0][0]).toBe('Hello <@1>!');
	});

	test('onChangeText drops a mention whose label was edited', async () => {
		const onChange = jest.fn();
		const { result } = await renderUseMention({ value: 'Hello <@1>', onChange, partTypes });

		await act(async () => {
			result.current.inputProps.onChangeText('Hello @');
		});

		expect(onChange.mock.calls[0][0]).toBe('Hello @');
		expect(onChange.mock.calls[0][1].every((part: { data?: unknown }) => !part.data)).toBe(true);
	});

	test('tracks the selection and forwards the event', async () => {
		const onSelectionChange = jest.fn();
		const hook = await renderUseMention({ value: 'Hello @jo', onChange: jest.fn(), partTypes, onSelectionChange });

		await hook.selectionChange(9, 9);

		expect(hook.result.current.inputProps.selection).toEqual({ start: 9, end: 9 });
		expect(onSelectionChange).toHaveBeenCalledTimes(1);
	});

	test('works without an onSelectionChange handler', async () => {
		const hook = await renderUseMention({ value: 'Hello @jo', onChange: jest.fn(), partTypes });

		await hook.selectionChange(9, 9);

		expect(hook.result.current.inputProps.selection).toEqual({ start: 9, end: 9 });
	});

	test('exposes the keyword of the mention being typed at the cursor', async () => {
		const hook = await renderUseMention({ value: 'Hello @jo', onChange: jest.fn(), partTypes });

		expect(hook.result.current.suggestions['@'].keyword).toBeUndefined();

		await hook.selectionChange(9, 9);

		expect(hook.result.current.suggestions['@'].keyword).toBe('jo');
	});

	test('applies a pressed suggestion through onChange', async () => {
		const onChange = jest.fn();
		const hook = await renderUseMention({ value: 'Hello @jo', onChange, partTypes });

		await hook.selectionChange(9, 9);
		await act(async () => {
			hook.result.current.suggestions['@'].onSuggestionPress({ id: '1' });
		});

		expect(onChange).toHaveBeenCalledWith('Hello <@1>', hook.result.current.parts);
	});

	test('ignores a pressed suggestion when no keyword is being typed', async () => {
		const onChange = jest.fn();
		const { result } = await renderUseMention({ value: 'Hello', onChange, partTypes });

		await act(async () => {
			result.current.suggestions['@'].onSuggestionPress({ id: '1' });
		});

		expect(onChange).not.toHaveBeenCalled();
	});

	test('passes an empty value once the text is cleared, and stops once it is filled again', async () => {
		const { result, rerender } = await renderUseMention({ value: 'Hello', onChange: jest.fn(), partTypes });

		expect(result.current.inputProps.value).toBeUndefined();

		await rerender({ value: '', onChange: jest.fn(), partTypes });

		expect(result.current.inputProps.value).toBe('');

		await rerender({ value: 'Hi', onChange: jest.fn(), partTypes });

		expect(result.current.inputProps.value).toBeUndefined();
	});

	test('does not pass an empty value when it starts out empty', async () => {
		const { result } = await renderUseMention({ value: '', onChange: jest.fn(), partTypes });

		expect(result.current.inputProps.value).toBeUndefined();
	});

	describe('referential stability', () => {
		const options: UseMentionOptions = { value: 'Hello @jo', onChange: jest.fn(), partTypes };

		test('keeps inputProps and suggestions stable across unrelated re-renders', async () => {
			const hook = await renderUseMention(options);
			const { inputProps, suggestions } = hook.result.current;

			await hook.rerender({ ...options });

			expect(hook.renderCount).toBe(2);
			expect(hook.result.current.inputProps).toBe(inputProps);
			expect(hook.result.current.suggestions).toBe(suggestions);
		});

		test('keeps the parts stable when only the selection changes', async () => {
			const hook = await renderUseMention(options);
			const { parts } = hook.result.current;

			await hook.selectionChange(9, 9);

			expect(hook.result.current.parts).toBe(parts);
		});

		test('re-renders once per selection change', async () => {
			const hook = await renderUseMention(options);

			await hook.selectionChange(9, 9);

			expect(hook.renderCount).toBe(2);
		});

		test('keeps the props stable when the selection is set to the same value', async () => {
			const hook = await renderUseMention(options);
			await hook.selectionChange(9, 9);
			const { inputProps, suggestions } = hook.result.current;

			await hook.selectionChange(9, 9);

			expect(hook.result.current.inputProps).toBe(inputProps);
			expect(hook.result.current.suggestions).toBe(suggestions);
			expect(hook.result.current.inputProps.selection).toBe(inputProps.selection);
		});

		test('gives new props when the value changes', async () => {
			const hook = await renderUseMention(options);
			const { inputProps } = hook.result.current;

			await hook.rerender({ ...options, value: 'Hello @joh' });

			expect(hook.result.current.inputProps).not.toBe(inputProps);
		});
	});
});
