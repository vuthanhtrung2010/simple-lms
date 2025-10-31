import { type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema.js';

export type D1Database = DrizzleD1Database<typeof schema>;
export type QuestionType =
	| 'text_only'
	| 'single_choice'
	| 'multiple_choice'
	| 'true_false'
	| 'short_answer'
	| 'fill_blank'
	| 'matching'
	| 'numeric';

export type SupportedExtension = 'jpg' | 'jpeg' | 'png' | 'gif' | 'mp4' | 'mp3' | 'wav' | 'pdf';
export type MediaUrl = `${string}.${SupportedExtension}` | `https://${string}` | `http://${string}`;

export interface SingleChoiceConfig {
	options: {
		text: string;
		isCorrect: boolean;
		feedback?: string;
	}[];
}

export interface MultipleChoiceConfig {
	options: {
		text: string;
		isCorrect: boolean;
		partialCredit?: number;
	}[];
}

export interface TrueFalseConfig {
	options: {
		text: string;
		isCorrect: boolean;
		feedback?: string;
	}[];
}

export interface ShortAnswerConfig {
	answers: string[];
	caseSensitive: boolean;
	isRegex: boolean;
}

export interface FillBlankConfig {
	blanks: {
		index: number;
		answers: string[];
		caseSensitive: boolean;
		isRegex: boolean;
	}[];
}

export interface MatchingConfig {
	items: {
		text: string;
		correctAnswer: string;
	}[];
	choices: {
		id: string;
		text: string; // Aka its desc
	}[];
}

export interface BaseQuestion {
	questionType: QuestionType;
	questionText: string;
	explanation?: string;
	points?: number; // text_only don't have points...
	orderIndex: number;
	config?:
		| SingleChoiceConfig
		| MultipleChoiceConfig
		| TrueFalseConfig
		| ShortAnswerConfig
		| FillBlankConfig
		| MatchingConfig;
	media?: MediaUrl[];
}
