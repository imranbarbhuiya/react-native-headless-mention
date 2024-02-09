import type { Change } from 'diff';
import type { ReactNode, Ref } from 'react';
import type { StyleProp, TextInput, TextInputProps, TextStyle, ViewStyle } from 'react-native';

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
	name?: string;
	// RegExp with global flag
	pattern: RegExp;
	renderPosition?: 'bottom' | 'top';
	renderSuggestions?: (props: MentionSuggestionsProps) => ReactNode;
	textStyle?: StyleProp<TextStyle>;
	trigger: string;
}

interface PatternPartType {
	name?: string;
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

type MentionInputProps = Omit<TextInputProps, 'onChange'> & {
	containerStyle?: StyleProp<ViewStyle>;
	inputRef?: Ref<TextInput>;
	onChange: (value: string) => any;
	partTypes?: PartType[];
	value: string;
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
	MentionInputProps,
};
