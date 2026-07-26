<div align="center">

# react-native-headless-mention

**A headless mention component for React Native.**

[![GitHub](https://img.shields.io/github/license/imranbarbhuiya/react-native-headless-mention)](https://github.com/imranbarbhuiya/react-native-headless-mention/blob/main/LICENSE)
[![codecov](https://codecov.io/gh/imranbarbhuiya/react-native-headless-mention/branch/main/graph/badge.svg?token=token)](https://codecov.io/gh/imranbarbhuiya/react-native-headless-mention)
[![npm](https://img.shields.io/npm/v/react-native-headless-mention?color=crimson&logo=npm&style=flat-square)](https://www.npmjs.com/package/react-native-headless-mention)

<video src="./.github/mention.mov" autoplay loop muted>

</div>

## Description

A headless mention component for React Native. It's a headless component, so you'll need to provide your styles and suggestions renderer.

The library never renders the suggestions for you. `useMention` hands you the keyword being typed and the handler to apply a suggestion, and you render the list wherever you want, be it above the input, below it, in a modal, a bottom sheet or a keyboard accessory.

## Features

-   Written In Typescript
-   Offers CJS, and ESM builds
-   Full TypeScript & JavaScript support

## Install

You can use the following command to install this package, or replace npm install with your package manager of choice.

```bash
npm i react-native-headless-mention
```

## Usage

### For mention with autocomplete

```tsx
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Input, useMention, type MentionSuggestionsProps, type PartType } from 'react-native-headless-mention';

const users = [
	{ id: '1', name: 'Parbez' },
	{ id: '2', name: 'Voxelli' },
	{ id: '3', name: 'Sho' },
	{ id: '4', name: 'Hound' },
	{ id: '5', name: 'Sarcaster' },
];

const partTypes: PartType[] = [
	{
		trigger: '@',
		textStyle: { fontWeight: 'bold', color: 'blue' },
		getLabel(mention) {
			const user = users.find((one) => one.id === mention.id);
			return user ? `@${user.name}` : `<@${mention.id}>`;
		},
		pattern: /<(?<trigger>@)(?<id>\d+)>/g,
	},
];

const Suggestions = ({ keyword, onSuggestionPress }: MentionSuggestionsProps) => {
	if (keyword === undefined) return null;

	return (
		<View>
			{users
				.filter((one) => one.name.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()))
				.map((one) => (
					<Pressable key={one.id} onPress={() => onSuggestionPress(one)} style={{ padding: 12 }}>
						<Text>{one.name}</Text>
					</Pressable>
				))}
		</View>
	);
};

export default function Campaigns() {
	const [value, setValue] = useState('');

	const { inputProps, suggestions } = useMention({ value, onChange: setValue, partTypes });

	return (
		<View>
			{/* Render this wherever you want, it doesn't have to be next to the input */}
			<Suggestions {...suggestions['@']} />

			<Input {...inputProps} />
		</View>
	);
}

```

> [!Important]
> The pattern must be a global regex. If it's a mention regex then don't forget to add the group name `trigger` and `id` in the regex.

> [!Note]
> Keep `partTypes` referentially stable (module scope, `useMemo` or state). Creating the array inline on every render re-parses the value on every render.

### `useMention`

`useMention({ value, onChange, partTypes, onSelectionChange? })` returns:

| Key           | Description                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `inputProps`  | Props to spread on `Input`. Holds the parsed parts, the selection and the change handlers.                                                      |
| `suggestions` | `{ [trigger]: { keyword, onSuggestionPress } }` for every mention part type. `keyword` is `undefined` when the suggestions shouldn't be shown. |
| `parts`       | The parsed parts of the current value.                                                                                                          |
| `plainText`   | The current value with every mention replaced by its label.                                                                                     |

Since the suggestions are just data, you can render them anywhere in your tree, including inside a portal, a modal or a `KeyboardAvoidingView`, and you can render the same trigger in more than one place.

`onSuggestionPress` is a no-op while its `keyword` is `undefined`, because there would be no trigger in the text to replace.

#### Performance

`useMention` owns the selection state, so the component that calls it re-renders on every keystroke and cursor move. If it also renders expensive siblings, keep the hook in a small component around the input and the suggestions.

`inputProps` and `suggestions` are memoized, so they stay referentially stable until the value, the selection or the part types actually change. A selection change event that doesn't move the cursor changes nothing at all, which keeps repeated `onSelectionChange` events from cascading. That makes `React.memo` worthwhile on a heavy suggestions list.

> [!Note]
> 2nd param of `onChange` provides all the parts of the value. You can use it to get the mentions present in the value.

### Get mentions from the value

```tsx
import { parseValue, type MentionPartType } from 'react-native-headless-mention';


const partTypes: MentionPartType[] = [
	{
		trigger: '@',
		textStyle: { fontWeight: '500' },
		getLabel(mention) {
			const user = users.find((one) => one.id === mention.id);
			return user ? `@${user.name}` : `<@${mention.id}>`;
		},
		pattern: /<(?<trigger>@)(?<id>\d+)>/g,
	},
];

const values = parseValue(value, partTypes);

console.log(values.parts.filter((part) => part.data?.trigger === '@').map((part) => part.data?.id));
```

### For formatting
This lib can also be used for formatting. It doesn't provide any pre-defined formatting but you can do it with regex. Here's a simple demo to achive simple markdown support

```tsx
import { useState } from 'react';
import { Input, useMention, type PartType } from 'react-native-headless-mention';

const partTypes: PartType[] = [
	{
		textStyle: { fontWeight: '700' },
		pattern: /\*\*(?<text>\S(?:.*?\S)?)\*\*/g,
	},
	{
		textStyle: { textDecorationLine: 'underline' },
		pattern: /__(?<text>\S(?:.*?\S)?)__/g,
	},
	{
		textStyle: { fontStyle: 'italic' },
		pattern: /\*(?<text>\S(?:.*?\S)?)\*/g,
	},
	{
		textStyle: { fontStyle: 'italic' },
		pattern: /_(?<text>\S(?:.*?\S)?)_/g,
	},
	{
		textStyle: { textDecorationLine: 'line-through' },
		pattern: /~(?<text>\S(?:.*?\S)?)~/g,
	},
];

export default function Campaigns() {
	const [value, setValue] = useState('');

	const { inputProps } = useMention({ value, onChange: setValue, partTypes });

	return <Input {...inputProps} />;
}

```

## Migrating from v1

`Input` no longer renders the suggestions, so it no longer owns the mention state either. Move it to `useMention` and render the suggestions yourself:

-   `partTypes[].renderSuggestions` and `partTypes[].renderPosition` are removed. Use `suggestions[trigger]` from `useMention` and render it where you want.
-   `Input` no longer takes `value`, `onChange` and `partTypes`. Pass them to `useMention` and spread the returned `inputProps` on `Input`.
-   `containerStyle` is removed along with the wrapper `View` that used to hold the suggestions. Wrap `Input` in your own `View` if you need it.
-   `inputRef` and the rest of the `TextInput` props still work the same.

Editing is also more careful with your mentions now: deleting or inserting text around a mention keeps it whole, where it could previously be dissolved into plain text.

```diff
-<Input
-	value={value}
-	onChange={setValue}
-	partTypes={[{ trigger: '@', renderSuggestions, renderPosition: 'top', ...rest }]}
-/>
+const { inputProps, suggestions } = useMention({ value, onChange: setValue, partTypes });
+
+<>
+	<Suggestions {...suggestions['@']} />
+	<Input {...inputProps} />
+</>
```

## Buy me some doughnuts

If you want to support me by donating, you can do so by using any of the following methods. Thank you very much in advance!

<a href="https://github.com/sponsors/imranbarbhuiya" target="_blank"><img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" alt="Buy Me A Coffee" height="41" width="174"></a>
<a href="https://www.buymeacoffee.com/parbez" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>
<a href='https://ko-fi.com/Y8Y1CBIJH' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi4.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## Contributors ✨

Thanks goes to these wonderful people:

<a href="https://github.com/imranbarbhuiya/react-native-headless-mention/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=imranbarbhuiya/react-native-headless-mention" />
</a>
