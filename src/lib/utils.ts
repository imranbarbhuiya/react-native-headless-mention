export interface Selection {
	end: number;
	start: number;
}

export enum Tags {
	Hashtag = 'hashtag',
	Italic = 'italic',
	Mention = 'mention',
	Strong = 'strong',
	Underline = 'underline',
}

export const between = (x: number, min: number, max: number) => x >= min && x <= max;

export const isKeysAreSame = (src: [number, number], dest: [number, number]) => src.toString() === dest.toString();

export const getLastItemInMap = <K, V>(map: Map<K, V>) => Array.from(map)[map.size - 1];

export const getLastKeyInMap = <K, V>(map: Map<K, V>) => Array.from(map.keys())[map.size - 1];

export const getLastValueInMap = <K, V>(map: Map<K, V>) => Array.from(map.values())[map.size - 1];

export const getSelectedMentionKeys = (map: Map<[number, number], any>, { start, end }: Selection) => {
	const mentionKeys = [...map.keys()];
	return mentionKeys.filter(([a, b]) => between(a, start, end) || between(b, start, end));
};

export const updateRemainingMentionsIndexes = (
	map: Map<[number, number], any>,
	{ start, end }: Selection,
	diff: number,
	shouldAdd: boolean,
) => {
	const newMap = new Map(map);
	const keys = getSelectedMentionKeys(newMap, { start, end });
	for (const key of keys) {
		const newKey: [number, number] = shouldAdd ? [key[0] + diff, key[1] + diff] : [key[0] - diff, key[1] - diff];
		const value = newMap.get(key)!;
		newMap.delete(key);
		newMap.set(newKey, value);
	}
	return newMap;
};

export const findMentionKeyInMap = (map: Map<[number, number], any>, cursorIndex: number) => {
	const keys = [...map.keys()];
	return keys.find(([a, b]) => between(cursorIndex, a, b));
};

export const addMenInSelection = (
	selection: Selection,
	prevSelection: Selection,
	mentions: Map<[number, number], any>,
) => {
	const sel = { ...selection };
	for (const [[menStart, menEnd]] of mentions) {
		if (Math.abs(prevSelection.start - prevSelection.end) < Math.abs(sel.start - sel.end)) {
			if (between(sel.start, menStart, menEnd)) {
				sel.start = menStart;
			}
			if (between(sel.end - 1, menStart, menEnd)) {
				sel.end = menEnd + 1;
			}
		} else {
			if (between(sel.start, menStart, menEnd)) {
				sel.start = menEnd + 1;
			}
			if (between(sel.end, menStart, menEnd)) {
				sel.end = menStart;
			}
		}
	}

	return sel;
};

export const moveCursorToMentionBoundary = (
	selection: Selection,
	prevSelection: Selection,
	mentions: Map<[number, number], any>,
	isTrackingStarted: boolean,
) => {
	const sel = { ...selection };
	if (isTrackingStarted) return sel;
	for (const [[menStart, menEnd]] of mentions) {
		if (prevSelection.start > sel.start) {
			if (between(sel.start, menStart, menEnd)) {
				sel.start = menStart;
				sel.end = menStart;
			}
		} else if (between(sel.start - 1, menStart, menEnd)) {
			sel.start = menEnd + 1;
			sel.end = menEnd + 1;
		}
	}
	return sel;
};

export const findMentions = (val: string) => {
	// TODO: change regex
	// eslint-disable-next-line prefer-named-capture-group
	const reg = /@\[([^\]]+?)]\(id:([^\]]+?)\)/gim;
	const indexes = [];
	let match;
	while ((match = reg.exec(val))) {
		indexes.push({
			start: match.index,
			end: reg.lastIndex - 1,
			username: match[1],
			id: match[2],
			type: Tags.Mention,
		});
	}
	return indexes;
};

export const getMentionsWithInputText = (inputText: string) => {
	const map = new Map<[number, number], any>();
	let newValue = '';

	if (inputText === '') return { map, newValue };
	const retLines = inputText.split('\n');

	for (const [rowIndex, retLine] of retLines.entries()) {
		const mentions = findMentions(retLine);
		if (mentions.length) {
			let lastIndex = 0;
			let endIndexDiff = 0;
			for (const [index, men] of mentions.entries()) {
				newValue = newValue.concat(retLine.slice(lastIndex, men.start));
				const username = `@${men.username}`;
				newValue = newValue.concat(username);
				const menEndIndex = men.start + (username.length - 1);
				map.set([men.start - endIndexDiff, menEndIndex - endIndexDiff], {
					id: men.id,
					username: men.username,
				});
				endIndexDiff += Math.abs(men.end - menEndIndex);
				lastIndex = men.end + 1;
				if (mentions.length - 1 === index) {
					const lastStr = retLine.slice(lastIndex);
					newValue = newValue.concat(lastStr);
				}
			}
		} else {
			newValue = newValue.concat(retLine);
		}
		if (rowIndex !== retLines.length - 1) {
			newValue = newValue.concat('\n');
		}
	}
	return {
		map,
		newValue,
	};
};

export const displayTextWithMentions = (inputText: string, formatMentionNode: (name: string, id: string) => string) => {
	if (inputText === '') return null;
	const retLines = inputText.split('\n');
	const formattedText = [];
	for (const [rowIndex, retLine] of retLines.entries()) {
		const mentions = findMentions(retLine);
		if (mentions.length) {
			let lastIndex = 0;
			for (const [index, men] of mentions.entries()) {
				const initialStr = retLine.slice(lastIndex, men.start);
				lastIndex = men.end + 1;
				formattedText.push(initialStr);
				const formattedMention = formatMentionNode(`@${men.username}`, `${index}-${men.id}-${rowIndex}`);
				formattedText.push(formattedMention);
				if (mentions.length - 1 === index) {
					const lastStr = retLine.slice(lastIndex);
					formattedText.push(lastStr);
				}
			}
		} else {
			formattedText.push(retLine);
		}
		if (rowIndex !== retLines.length - 1) {
			formattedText.push('\n');
		}
	}
	return formattedText;
};

export const formatText = (
	inputText: string,
	// TODO: value type
	mentionsMap: Map<[number, number], { id: string; username: string }>,
	formatMentionNode: (args: { id: string; key: string; name: string }) => React.ReactNode,
) => {
	if (inputText === '' || !mentionsMap.size) return inputText;
	const formattedText: React.ReactNode[] = [];
	let lastIndex = 0;
	for (const [[start, end], men] of mentionsMap) {
		const initialStr = start === 1 ? '' : inputText.slice(lastIndex, start);
		lastIndex = end + 1;
		formattedText.push(initialStr);
		const formattedMention = formatMentionNode({
			name: `@${men.username}`,
			id: men.id,
			key: `${start}-${men.id}-${end}`,
		});
		formattedText.push(formattedMention);
		if (isKeysAreSame(getLastKeyInMap(mentionsMap), [start, end])) {
			const lastStr = inputText.slice(lastIndex);
			formattedText.push(lastStr);
		}
	}

	return formattedText;
};
