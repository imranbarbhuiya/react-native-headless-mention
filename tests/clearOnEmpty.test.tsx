import { render, screen } from '@testing-library/react-native';
import { useImperativeHandle, type Ref } from 'react';
import { Text } from 'react-native';

import { Input, useMention } from '../src/index';

import type { MentionPartType, PartType } from '../src/lib/types';

const clear = jest.fn();

const ClearableInput = ({ ref, ...props }: { ref?: Ref<{ clear: () => void }>; testID?: string }) => {
	useImperativeHandle(ref, () => ({ clear }), []);

	return <Text {...props}>input</Text>;
};

const mentionPartType = (): MentionPartType => ({
	trigger: '@',
	pattern: /<(?<trigger>@)(?<id>\d+)>/g,
	getLabel: (mention) => `@${mention.id}`,
});

const Field = ({ value, partTypes }: { partTypes: PartType[]; value: string }) => {
	const { inputProps } = useMention({ value, onChange: jest.fn(), partTypes });

	return <Input {...inputProps} component={ClearableInput} testID="input" />;
};

describe('clearing the native input when the value empties', () => {
	beforeEach(() => {
		clear.mockClear();
	});

	// A direct chat: the part types never change identity
	test('clears with stable partTypes', async () => {
		const partTypes = [mentionPartType()];
		const { rerender } = await render(<Field partTypes={partTypes} value={'1\n2'} />);

		await rerender(<Field partTypes={partTypes} value="" />);

		expect(clear).toHaveBeenCalledTimes(1);
	});

	// A group chat: partTypes closes over the member list, which the optimistic send replaces,
	// so it arrives with a new identity in the very commit that empties the value
	test('clears when partTypes changes identity in the same commit', async () => {
		const { rerender } = await render(<Field partTypes={[mentionPartType()]} value={'1\n2'} />);

		await rerender(<Field partTypes={[mentionPartType()]} value="" />);

		expect(clear).toHaveBeenCalledTimes(1);
	});

	test('clears when partTypes changes identity again right after the value empties', async () => {
		const { rerender } = await render(<Field partTypes={[mentionPartType()]} value={'1\n2'} />);

		await rerender(<Field partTypes={[mentionPartType()]} value="" />);
		await rerender(<Field partTypes={[mentionPartType()]} value="" />);

		expect(clear).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('input').props.value).toBe('');
	});

	// The screen re-renders with fresh part types before the store clears the draft
	test('clears when partTypes changes identity in the commit before the value empties', async () => {
		const { rerender } = await render(<Field partTypes={[mentionPartType()]} value={'1\n2'} />);

		await rerender(<Field partTypes={[mentionPartType()]} value={'1\n2'} />);
		await rerender(<Field partTypes={[mentionPartType()]} value="" />);

		expect(clear).toHaveBeenCalledTimes(1);
	});
});
