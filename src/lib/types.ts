import type { Change } from 'diff';
import type { Ref } from 'react';
import type {
	StyleProp,
	TextInput,
	TextInputProps,
	TextInputSelectionChangeEvent,
	TextStyle,
} from 'react-native';

interface Suggestion {
	id: string;
}

interface MentionData {
	id: string;
	original: string;
	result?: RegExpMatchArray;
	trigger: string;
}

type CharactersDiffChange = Omit<Change, 'count'> & { count: number };

interface Selection {
	end: number;
	start: number;
}

interface MentionSuggestionsProps {
	keyword: string | undefined;
	onSuggestionPress: (suggestion: Suggestion) => void;
}

interface MentionPartType {
	allowedSpacesCount?: number;
	getLabel: (mention: MentionData) => string;
	insertSpaceAfterMention?: boolean;
	// RegExp with global flag
	pattern: RegExp;
	textStyle?: StyleProp<TextStyle>;
	trigger: string;
}

interface PatternPartType {
	// RegExp with global flag
	pattern: RegExp;
	textStyle?: StyleProp<TextStyle>;
}

type PartType = MentionPartType | PatternPartType;

interface Part {
	data?: MentionData;
	partType?: PartType;
	position: Selection;
	text: string;
}

interface UseMentionOptions {
	onChange: (value: string, parts: Part[]) => any;
	onSelectionChange?: (event: TextInputSelectionChangeEvent) => void;
	partTypes?: PartType[];
	value: string;
}

/**
 * Props returned by `useMention` which are meant to be spread onto `Input`.
 */
interface MentionInputControlProps {
	onChangeText: (text: string) => void;
	onSelectionChange: (event: TextInputSelectionChangeEvent) => void;
	parts: Part[];
	selection: Selection;
	value?: string;
}

interface UseMentionResult {
	inputProps: MentionInputControlProps;
	parts: Part[];
	plainText: string;
	suggestions: { [trigger: string]: MentionSuggestionsProps };
}

type MentionInputProps = MentionInputControlProps &
	Omit<TextInputProps, 'children' | 'onChange' | 'onChangeText' | 'onSelectionChange' | 'selection' | 'value'> & {
		component?: React.ElementType;
		inputRef?: Ref<TextInput>;
	};

export type {
	Suggestion,
	MentionData,
	CharactersDiffChange,
	Selection as Position,
	Part,
	MentionSuggestionsProps,
	MentionPartType,
	PatternPartType,
	PartType,
	UseMentionOptions,
	UseMentionResult,
	MentionInputControlProps,
	MentionInputProps,
};
