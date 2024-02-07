import React, { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
	type NativeSyntheticEvent,
	Text,
	TextInput,
	type TextInputProps,
	type TextInputSelectionChangeEventData,
	View,
	type ViewProps,
} from 'react-native';
import {
	type Selection,
	addMenInSelection,
	findMentionKeyInMap,
	formatText,
	getLastKeyInMap,
	getMentionsWithInputText,
	getSelectedMentionKeys,
	isKeysAreSame,
	updateRemainingMentionsIndexes,
} from './lib/utils';

type TextProps = Omit<TextInputProps, 'onChangeText' | 'value'>;
interface EditorMethods {
	keyword: string;
	onSuggestionTap: (user: any) => void;
	resetTextbox: () => void;
}

export function Editor({
	textInputProps: { style: displayStyle, ...textInputProps } = {},
	formatMentionNode,
	value,
	onChangeText,
	trigger = { key: '@', location: 'anywhere' },
	editorRef,
	...rest
}: ViewProps & {
	editorRef?: MutableRefObject<EditorMethods | null>;
	formatMentionNode: (args: { id: string; key: string; name: string }) => React.ReactNode;
	onChangeText?: (args: {
		displayText: string;
		text: string;
	}) => void;
	textInputProps?: TextProps;
	trigger?: {
		key: string;
		location: 'anywhere' | 'new-word-only';
	};
	value?: string;
}) {
	const mentionMap = useRef(new Map<[number, number], any>());
	const [text, setText] = useState<string>('');
	const [formattedText, setFormattedText] = useState<React.ReactNode>('');
	const [selection, setSelection] = useState<Selection>({
		start: 0,
		end: 0,
	});
	const previousChar = useRef(' ');
	const [isTrackingStarted, setIsTrackingStarted] = useState(false);
	const [menIndex, setMenIndex] = useState(0);
	const [keyword, setKeyword] = useState('');

	useEffect(() => {
		const { map, newValue } = getMentionsWithInputText(value ?? '');

		mentionMap.current = map;
		setText(newValue);
		setFormattedText(formatText(newValue, mentionMap.current, formatMentionNode));
		sendMessageToFooter(newValue);
	}, []);

	const startTracking = (menIndex: number) => {
		setIsTrackingStarted(true);
		setMenIndex(menIndex);
		setKeyword('');
	};

	const stopTracking = () => {
		setIsTrackingStarted(false);
	};

	const resetTextbox = () => {
		previousChar.current = ' ';
		stopTracking();
	};

	const updateSuggestions = (lastKeyword: string) => {
		setKeyword(lastKeyword);
	};

	const updateMentionsMap = (selection: Selection, count: number, shouldAdd: boolean) => {
		mentionMap.current = updateRemainingMentionsIndexes(mentionMap.current, selection, count, shouldAdd);
	};

	function getInitialAndRemainingStrings(inputText: string, menIndex: number) {
		let initialStr = inputText.slice(0, menIndex).trim();
		if (initialStr) {
			initialStr += ' ';
		}

		let remStr =
			inputText
				.slice(menIndex + 1)
				.replace(/\s+/, '\u0001')
				.split('\u0001')[1] || '';

		const adjMentIndexes = {
			start: initialStr.length - 1,
			end: inputText.length - remStr.length - 1,
		};
		const mentionKeys = getSelectedMentionKeys(mentionMap.current, adjMentIndexes);
		for (const key of mentionKeys) {
			remStr = `@${mentionMap.current.get(key).username} ${remStr}`;
		}
		return {
			initialStr,
			remStr,
		};
	}

	const onSuggestionTap = (user: any) => {
		const { initialStr, remStr } = getInitialAndRemainingStrings(text, menIndex);

		const username = `@${user.username}`;
		const formattedStr = `${initialStr}${username} ${remStr}`;
		//'@[__display__](__id__)' ///find this trigger parsing from react-mentions

		//set the mentions in the map.
		const menStartIndex = initialStr.length;
		const menEndIndex = menStartIndex + (username.length - 1);

		mentionMap.current.set([menStartIndex, menEndIndex], user);

		// update remaining mentions indexes
		const charAdded = Math.abs(formattedStr.length - text.length);
		updateMentionsMap(
			{
				start: menEndIndex + 1,
				end: formattedStr.length,
			},
			charAdded,
			true,
		);

		setText(formattedStr);
		setFormattedText(formatText(formattedStr, mentionMap.current, formatMentionNode));
		stopTracking();
		sendMessageToFooter(formattedStr);
	};

	const formatTextWithMentions = (inputText: string) => {
		if (inputText === '' || !mentionMap.current.size) return inputText;
		let formattedText = '';
		let lastIndex = 0;
		for (const [[start, end], men] of mentionMap.current) {
			const initialStr = start === 1 ? '' : inputText.slice(lastIndex, start);
			lastIndex = end + 1;
			formattedText = formattedText.concat(initialStr);
			formattedText = formattedText.concat(`@[${men.username}](id:${men.id})`);
			if (isKeysAreSame(getLastKeyInMap(mentionMap.current), [start, end])) {
				const lastStr = inputText.slice(lastIndex);
				formattedText = formattedText.concat(lastStr);
			}
		}
		return formattedText;
	};

	function sendMessageToFooter(text: string) {
		onChangeText?.({
			displayText: text,
			text: formatTextWithMentions(text),
		});
	}

	const handleSelectionChange = ({
		nativeEvent: { selection },
	}: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
		const prevSelection = selection;
		let newSelection = { ...selection };
		if (newSelection.start !== newSelection.end) {
			newSelection = addMenInSelection(newSelection, prevSelection, mentionMap.current);
		}

		setSelection(newSelection);
	};

	const identifyKeyword = (inputText: string) => {
		if (isTrackingStarted) {
			let pattern = null;
			if (trigger.location === 'new-word-only') {
				pattern = new RegExp(`\\B${trigger.key}[a-z0-9_-]+|\\B${trigger.key}`, `gi`);
			} else {
				pattern = new RegExp(`\\${trigger.key}[a-z0-9_-]+|\\${trigger.key}`, `i`);
			}
			const str = inputText.slice(menIndex);
			const keywordArray = str.match(pattern);
			if (keywordArray && Boolean(keywordArray.length)) {
				const lastKeyword = keywordArray[keywordArray.length - 1];
				updateSuggestions(lastKeyword);
			}
		}
	};

	const checkForMention = (inputText: string, selection: Selection) => {
		const menIndex = selection.start - 1;
		const lastChar = inputText.slice(menIndex, menIndex + 1);
		const wordBoundary = trigger.location === 'new-word-only' ? previousChar.current.trim().length === 0 : true;
		if (lastChar === trigger.key && wordBoundary) {
			startTracking(menIndex);
		} else if (lastChar.trim() === '' && isTrackingStarted) {
			stopTracking();
		}
		previousChar.current = lastChar;
		identifyKeyword(inputText);
	};

	function onChange(inputText: string) {
		let text = inputText;
		const prevText = inputText;
		const newSelection = { ...selection };
		if (text.length < prevText.length) {
			let charDeleted = Math.abs(text.length - prevText.length);
			const totalSelection = {
				start: newSelection.start,
				end: charDeleted > 1 ? newSelection.start + charDeleted : newSelection.start,
			};

			if (totalSelection.start === totalSelection.end) {
				const key = findMentionKeyInMap(mentionMap.current, totalSelection.start);
				if (key?.length) {
					mentionMap.current.delete(key);
					const initial = text.slice(0, Math.max(0, key[0]));
					text = initial + text.slice(key[1]);
					charDeleted += Math.abs(key[0] - key[1]);
					mentionMap.current.delete(key);
				}
			} else {
				const mentionKeys = getSelectedMentionKeys(mentionMap.current, totalSelection);
				for (const key of mentionKeys) {
					mentionMap.current.delete(key);
				}
			}
			updateMentionsMap(
				{
					start: newSelection.end,
					end: prevText.length,
				},
				charDeleted,
				false,
			);
		} else {
			const charAdded = Math.abs(text.length - prevText.length);
			updateMentionsMap(
				{
					start: newSelection.end,
					end: text.length,
				},
				charAdded,
				true,
			);

			if (newSelection.start === newSelection.end) {
				const key = findMentionKeyInMap(mentionMap.current, newSelection.start - 1);
				if (key?.length) {
					mentionMap.current.delete(key);
				}
			}
		}

		setText(text);
		setFormattedText(formatText(text, mentionMap.current, formatMentionNode));

		checkForMention(text, newSelection);
		sendMessageToFooter(text);
	}

	useEffect(() => {
		if (editorRef) {
			editorRef.current = {
				keyword,
				onSuggestionTap,
				resetTextbox,
			};
		}
	}, [keyword]);

	return (
		<View {...rest}>
			<View
				style={[
					{
						position: 'absolute',
						top: 0,
						width: '100%',
					},
					displayStyle,
				]}
			>
				{formattedText === '' ? <Text>{formattedText}</Text> : <Text>{textInputProps.placeholder}</Text>}
			</View>
			<TextInput
				{...textInputProps}
				style={{
					fontSize: 16,
					fontWeight: '400',
					position: 'absolute',
					top: 0,
					color: 'transparent',
					alignSelf: 'stretch',
					width: '100%',
					height: '100%',
				}}
				value={text}
				selection={selection}
				selectionColor={'#000'}
				onSelectionChange={handleSelectionChange}
				scrollEnabled={false}
				multiline
				autoFocus
				onChangeText={onChange}
			/>
		</View>
	);
}
