import type { Change } from 'diff';
import type { Ref } from 'react';
import type { StyleProp, TextInput, TextInputProps, TextInputSelectionChangeEvent, TextStyle } from 'react-native';

/**
 * The thing a user picks from your suggestions list.
 *
 * Anything else you put on it is passed through to `getLabel` as part of the mention data, so you
 * can hand your own user or channel objects straight to `onSuggestionPress`.
 */
interface Suggestion {
	/**
	 * The id written into the value, as `<{trigger}{id}>`.
	 */
	id: string;
}

/**
 * A mention that was matched in the value.
 */
interface MentionData {
	/**
	 * The `id` capture group of the pattern, so the id of the suggestion that was picked.
	 */
	id: string;
	/**
	 * The raw text the pattern matched, for example `<@1>`, as opposed to the label shown in place of it.
	 */
	original: string;
	/**
	 * The full match of the pattern, in case you need the other capture groups.
	 */
	result?: RegExpMatchArray;
	/**
	 * The `trigger` capture group of the pattern, for example `@`.
	 */
	trigger: string;
}

type CharactersDiffChange = Omit<Change, 'count'> & { count: number };

/**
 * A range in the plain text, which is the text as it is shown, with every mention replaced by its label.
 */
interface Selection {
	end: number;
	start: number;
}

/**
 * The state of one trigger's suggestions, as returned by `useMention` under `suggestions[trigger]`.
 */
interface MentionSuggestionsProps {
	/**
	 * What the user has typed after the trigger, without the trigger itself.
	 *
	 * `undefined` means the suggestions should not be shown at all, either because the user isn't
	 * writing a mention for this trigger or because the keyword has ended. Render nothing in that case.
	 */
	keyword: string | undefined;
	/**
	 * Replaces the keyword being typed with the picked suggestion.
	 *
	 * Does nothing while `keyword` is `undefined`, since there would be no trigger in the text to replace.
	 */
	onSuggestionPress: (suggestion: Suggestion) => void;
}

/**
 * A part type that turns matches into mentions, which are atomic and can be suggested as the user types.
 */
interface MentionPartType {
	/**
	 * How many spaces the keyword may contain before the suggestions stop being offered.
	 *
	 * Spaces are counted between the trigger and the cursor, so with the default of `1` typing
	 * `@john doe` still offers suggestions, which suits searching a `first last` name, while
	 * `@john doe smith` no longer does. A new line always ends the keyword, whatever this is set to.
	 *
	 * @defaultValue 1
	 */
	allowedSpacesCount?: number;
	/**
	 * The text shown in place of the mention, for example `@Parbez` for a value of `<@1>`.
	 *
	 * This is what the user sees and edits, so keep it short and stable. Editing it breaks the
	 * mention apart into plain text.
	 */
	getLabel: (mention: MentionData) => string;
	/**
	 * Whether to insert a space after a mention that was added at the end of the value.
	 *
	 * @defaultValue false
	 */
	insertSpaceAfterMention?: boolean;
	/**
	 * The regex matching the mentions in the value, which must have the global flag.
	 *
	 * It needs a `trigger` and an `id` capture group, ideally named, for example
	 * `/<(?<trigger>@)(?<id>\d+)>/g`. Unnamed groups are read in that order.
	 */
	pattern: RegExp;
	/**
	 * The style applied to the label of every mention of this type.
	 */
	textStyle?: StyleProp<TextStyle>;
	/**
	 * The character that starts a mention, for example `@`.
	 *
	 * It only starts one at the very beginning of the value or after a space, and it must be the
	 * same character the `trigger` capture group of the pattern matches.
	 */
	trigger: string;
}

/**
 * A part type that only styles what it matches, for formatting such as bold or a link.
 *
 * Unlike a mention, the matched text is left in the value as it is and stays freely editable.
 */
interface PatternPartType {
	/**
	 * The regex matching the text to style, which must have the global flag.
	 */
	pattern: RegExp;
	/**
	 * The style applied to every match.
	 */
	textStyle?: StyleProp<TextStyle>;
}

type PartType = MentionPartType | PatternPartType;

/**
 * A piece of the parsed value, either a mention, a styled match or a run of plain text.
 */
interface Part {
	/**
	 * The mention this part holds, only set for parts matched by a mention part type.
	 *
	 * This is what you filter on to read the mentions out of a value.
	 */
	data?: MentionData;
	/**
	 * The part type that matched, unset for plain text.
	 */
	partType?: PartType;
	/**
	 * Where the part sits in the plain text.
	 */
	position: Selection;
	/**
	 * The text of the part, which is the label for a mention.
	 */
	text: string;
}

/**
 * The options of the `useMention` hook.
 */
interface UseMentionOptions {
	/**
	 * Called with the new value whenever the user edits the text or picks a suggestion.
	 *
	 * The second argument holds the parts of that new value, so you can read the mentions out of it
	 * without parsing it again.
	 */
	onChange: (value: string, parts: Part[]) => any;
	/**
	 * Called after the hook has tracked a selection change, in case you need the event yourself.
	 */
	onSelectionChange?: (event: TextInputSelectionChangeEvent) => void;
	/**
	 * The mention and pattern types to look for in the value.
	 *
	 * Keep the array referentially stable, so at module scope or in a `useMemo`, since creating it
	 * inline re-parses the value on every render.
	 *
	 * @defaultValue []
	 */
	partTypes?: PartType[];
	/**
	 * The raw value, so the text with the mentions still written as `<@1>`.
	 */
	value: string;
}

/**
 * The props `useMention` returns to be spread onto `Input`.
 */
interface MentionInputControlProps {
	onChangeText: (text: string) => void;
	onSelectionChange: (event: TextInputSelectionChangeEvent) => void;
	/**
	 * The parsed value, which `Input` renders as styled text.
	 */
	parts: Part[];
	selection: Selection;
	/**
	 * Only set while the value is being cleared, to hand the emptied text to the input itself.
	 */
	value?: string;
}

/**
 * What the `useMention` hook returns.
 */
interface UseMentionResult {
	/**
	 * The props to spread onto `Input`.
	 */
	inputProps: MentionInputControlProps;
	/**
	 * The parts of the current value, to read its mentions out of.
	 */
	parts: Part[];
	/**
	 * The current value with every mention replaced by its label, so the text as the user sees it.
	 */
	plainText: string;
	/**
	 * The suggestions state of every mention part type, keyed by trigger.
	 *
	 * Render these wherever you want, including outside of the input, in a modal or in a portal.
	 */
	suggestions: { [trigger: string]: MentionSuggestionsProps };
}

/**
 * The props of the `Input` component, which are the ones from `useMention` plus any `TextInput` prop.
 */
type MentionInputProps = MentionInputControlProps &
	Omit<TextInputProps, 'children' | 'onChange' | 'onChangeText' | 'onSelectionChange' | 'selection' | 'value'> & {
		/**
		 * The component rendered in place of `TextInput`, for a styled or animated input of your own.
		 *
		 * It has to forward its ref and take the `TextInput` props.
		 *
		 * @defaultValue TextInput
		 */
		component?: React.ElementType;
		/**
		 * A ref to the underlying input, to focus or blur it.
		 */
		inputRef?: Ref<TextInput>;
	};

export type {
	CharactersDiffChange,
	MentionData,
	MentionInputControlProps,
	MentionInputProps,
	MentionPartType,
	MentionSuggestionsProps,
	Part,
	PartType,
	PatternPartType,
	Selection as Position,
	Suggestion,
	UseMentionOptions,
	UseMentionResult,
};
