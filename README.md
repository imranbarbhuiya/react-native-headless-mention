<div align="center">

# react-native-headless-mention

**A headless mention component for React Native.**

[![GitHub](https://img.shields.io/github/license/imranbarbhuiya/react-native-headless-mention)](https://github.com/imranbarbhuiya/react-native-headless-mention/blob/main/LICENSE)
[![codecov](https://codecov.io/gh/imranbarbhuiya/react-native-headless-mention/branch/main/graph/badge.svg?token=token)](https://codecov.io/gh/imranbarbhuiya/react-native-headless-mention)
[![npm](https://img.shields.io/npm/v/react-native-headless-mention?color=crimson&logo=npm&style=flat-square)](https://www.npmjs.com/package/react-native-headless-mention)

</div>

## Description

A headless mention component for React Native. It's a headless component, so you'll need to provide your styles and suggestions renderer.

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

```tsx
import { useState, useRef, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Input, type MentionSuggestionsProps } from 'react-native-headless-mention';

const suggestions = [
	{ id: '1', name: 'Parbez' },
	{ id: '2', name: 'Voxelli' },
	{ id: '3', name: 'Sho' },
	{ id: '4', name: 'Hound' },
	{ id: '5', name: 'Sarcaster' },
];

const renderSuggestions = ({ keyword, onSuggestionPress }: MentionSuggestionsProps) => {
	if (keyword === undefined) return null;

	return (
		<View>
			{suggestions
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

	return (
		<Input
			onChange={setValue}
			partTypes={[
				{
					trigger: '@',
					renderSuggestions,
					textStyle: { fontWeight: 'bold', color: 'blue' },
					getLabel(mention) {
						const user = suggestions.find((one) => one.id === mention.id);
						return user ? `@${user.name}` : `<@${mention.id}>`;
					},
					pattern: /<(?<trigger>@)(?<id>\d+)>/g,
				},
			]}
			value={value}
		/>
	);
}

```

> [!Important]
> The pattern must be a global regex. If it's a mention regex then don't forget to add the group name `trigger` and `id` in the regex.

> [!Note]
> 2nd param of `onChange` provides all the parts of the value. You can use it to get the mentions present in the value.

### Get mentions from the value

```tsx
import { parseValue, type MentionPartType } from 'react-native-headless-mention';


const partTypes: MentionPartType[] = [
	{
		name: 'mention',
		trigger: '@',
		renderSuggestions,
		textStyle: { fontWeight: '500' },
		getLabel(mention) {
			const user = suggestions.find((one) => one.id === mention.id);
			return user ? `@${user.name}` : `<@${mention.id}>`;
		},
		pattern: /<(?<trigger>@)(?<id>\d+)>/g,
		renderPosition: 'bottom',
	},
];

const values = parseValue(value, partTypes);

console.log(values.parts.filter((part) => part.name === 'mention').map((part) => part.data?.id));
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
