import type {
	SingleChoiceConfig,
	MultipleChoiceConfig,
	TrueFalseConfig,
	ShortAnswerConfig,
	FillBlankConfig,
	MatchingConfig,
	QuestionType
} from '../types.js';

export interface QuestionAnswer {
	questionId: string;
	questionType: QuestionType;
	answer: any; // Can be number, number[], Record<string, string>, Record<number, string>, string, etc.
}

export interface QuestionData {
	id: string;
	questionType: QuestionType;
	config: any;
	points: number | null;
	explanation?: string;
}

export interface GradeResult {
	questionId: string;
	isCorrect: boolean;
	pointsEarned: number;
	pointsPossible: number;
	feedback?: string | null; // Specific feedback for the answer
	explanation?: string | null; // General explanation (fallback logic)
	details?: any; // Additional grading details (e.g., which blanks were correct)
}

/**
 * Grade a single choice or true/false question
 */
function gradeSingleChoice(
	answer: number | undefined,
	config: SingleChoiceConfig | TrueFalseConfig,
	points: number,
	questionExplanation?: string
): Omit<GradeResult, 'questionId'> {
	if (answer === undefined || answer === null) {
		return {
			isCorrect: false,
			pointsEarned: 0,
			pointsPossible: points,
			explanation: questionExplanation || null
		};
	}

	const selectedOption = config.options[answer];
	if (!selectedOption) {
		return {
			isCorrect: false,
			pointsEarned: 0,
			pointsPossible: points,
			explanation: questionExplanation || null
		};
	}

	const isCorrect = selectedOption.isCorrect;
	const feedback = selectedOption.feedback;
	const explanation = feedback || questionExplanation || null;

	return {
		isCorrect,
		pointsEarned: isCorrect ? points : 0,
		pointsPossible: points,
		feedback,
		explanation
	};
}

/**
 * Grade a multiple choice question
 */
function gradeMultipleChoice(
	answer: number[] | Set<number> | undefined,
	config: MultipleChoiceConfig,
	points: number,
	questionExplanation?: string
): Omit<GradeResult, 'questionId'> {
	const selectedIndices = answer instanceof Set ? Array.from(answer) : answer || [];
	const correctIndices = config.options
		.map((opt, idx) => (opt.isCorrect ? idx : -1))
		.filter((idx) => idx !== -1);

	if (selectedIndices.length === 0) {
		return {
			isCorrect: false,
			pointsEarned: 0,
			pointsPossible: points,
			explanation: questionExplanation || null
		};
	}

	// Check if all correct and no incorrect
	const selectedSet = new Set(selectedIndices);
	const correctSet = new Set(correctIndices);
	const isFullyCorrect =
		selectedSet.size === correctSet.size && [...selectedSet].every((idx) => correctSet.has(idx));

	if (isFullyCorrect) {
		return {
			isCorrect: true,
			pointsEarned: points,
			pointsPossible: points,
			explanation: questionExplanation || null
		};
	}

	// Partial credit: sum partialCredit for correct selections, penalize incorrect
	let partialPoints = 0;
	for (const idx of selectedIndices) {
		const option = config.options[idx];
		if (option?.isCorrect) {
			partialPoints += option.partialCredit || 0;
		}
	}

	// Cap at max points
	partialPoints = Math.min(partialPoints, points);

	return {
		isCorrect: false,
		pointsEarned: partialPoints,
		pointsPossible: points,
		explanation: questionExplanation || null,
		details: {
			correctCount: selectedIndices.filter((idx) => config.options[idx]?.isCorrect).length,
			totalCorrect: correctIndices.length
		}
	};
}

/**
 * Grade a short answer question
 */
function gradeShortAnswer(
	answer: string | undefined,
	config: ShortAnswerConfig,
	points: number,
	questionExplanation?: string
): Omit<GradeResult, 'questionId'> {
	if (!answer || answer.trim() === '') {
		return {
			isCorrect: false,
			pointsEarned: 0,
			pointsPossible: points,
			explanation: questionExplanation || null
		};
	}

	const userAnswer = config.caseSensitive ? answer.trim() : answer.trim().toLowerCase();

	for (const correctAnswer of config.answers) {
		const target = config.caseSensitive ? correctAnswer : correctAnswer.toLowerCase();

		if (config.isRegex) {
			try {
				const regex = new RegExp(target, config.caseSensitive ? '' : 'i');
				if (regex.test(answer.trim())) {
					return {
						isCorrect: true,
						pointsEarned: points,
						pointsPossible: points,
						explanation: questionExplanation || null
					};
				}
			} catch (e) {
				// Invalid regex, skip
			}
		} else {
			if (userAnswer === target) {
				return {
					isCorrect: true,
					pointsEarned: points,
					pointsPossible: points,
					explanation: questionExplanation || null
				};
			}
		}
	}

	return {
		isCorrect: false,
		pointsEarned: 0,
		pointsPossible: points,
		explanation: questionExplanation || null
	};
}

/**
 * Grade a fill-in-the-blank question
 */
function gradeFillBlank(
	answer: Record<number, string> | undefined,
	config: FillBlankConfig,
	points: number,
	questionExplanation?: string
): Omit<GradeResult, 'questionId'> {
	const userAnswers = answer || {};
	const totalBlanks = config.blanks.length;
	const pointsPerBlank = totalBlanks > 0 ? points / totalBlanks : 0;

	let correctBlanks = 0;
	const blankResults: Record<number, boolean> = {};

	for (const blank of config.blanks) {
		const userAnswer = userAnswers[blank.index];
		blankResults[blank.index] = false;

		if (!userAnswer || userAnswer.trim() === '') {
			continue;
		}

		const trimmed = blank.caseSensitive ? userAnswer.trim() : userAnswer.trim().toLowerCase();

		for (const correctAnswer of blank.answers) {
			const target = blank.caseSensitive ? correctAnswer : correctAnswer.toLowerCase();

			if (blank.isRegex) {
				try {
					const regex = new RegExp(target, blank.caseSensitive ? '' : 'i');
					if (regex.test(userAnswer.trim())) {
						correctBlanks++;
						blankResults[blank.index] = true;
						break;
					}
				} catch (e) {
					// Invalid regex
				}
			} else {
				if (trimmed === target) {
					correctBlanks++;
					blankResults[blank.index] = true;
					break;
				}
			}
		}
	}

	const isCorrect = correctBlanks === totalBlanks;
	const pointsEarned = correctBlanks * pointsPerBlank;

	return {
		isCorrect,
		pointsEarned: Math.round(pointsEarned * 100) / 100, // Round to 2 decimals
		pointsPossible: points,
		explanation: questionExplanation || null,
		details: {
			correctBlanks,
			totalBlanks,
			blankResults
		}
	};
}

/**
 * Grade a matching question
 */
function gradeMatching(
	answer: Record<string, string> | undefined,
	config: MatchingConfig,
	points: number,
	questionExplanation?: string
): Omit<GradeResult, 'questionId'> {
	const userAnswers = answer || {};
	const totalItems = config.items.length;
	const pointsPerItem = totalItems > 0 ? points / totalItems : 0;

	let correctMatches = 0;
	const itemResults: Record<string, boolean> = {};

	for (const item of config.items) {
		const userChoice = userAnswers[item.text];
		const isCorrect = userChoice === item.correctAnswer;
		itemResults[item.text] = isCorrect;
		if (isCorrect) correctMatches++;
	}

	const isFullyCorrect = correctMatches === totalItems;
	const pointsEarned = correctMatches * pointsPerItem;

	return {
		isCorrect: isFullyCorrect,
		pointsEarned: Math.round(pointsEarned * 100) / 100,
		pointsPossible: points,
		explanation: questionExplanation || null,
		details: {
			correctMatches,
			totalItems,
			itemResults
		}
	};
}

/**
 * Grade a numeric question
 */
function gradeNumeric(
	answer: number | string | undefined,
	config: { answer: number; tolerance?: number; unit?: string },
	points: number,
	questionExplanation?: string
): Omit<GradeResult, 'questionId'> {
	if (answer === undefined || answer === null || answer === '') {
		return {
			isCorrect: false,
			pointsEarned: 0,
			pointsPossible: points,
			explanation: questionExplanation || null
		};
	}

	const userNum = typeof answer === 'string' ? parseFloat(answer) : answer;
	if (isNaN(userNum)) {
		return {
			isCorrect: false,
			pointsEarned: 0,
			pointsPossible: points,
			explanation: questionExplanation || null
		};
	}

	const tolerance = config.tolerance || 0;
	const isCorrect = Math.abs(userNum - config.answer) <= tolerance;

	return {
		isCorrect,
		pointsEarned: isCorrect ? points : 0,
		pointsPossible: points,
		explanation: questionExplanation || null
	};
}

/**
 * Main grading function
 */
export function gradeQuestion(question: QuestionData, answer: QuestionAnswer): GradeResult {
	const points = question.points || 0;
	const questionType = question.questionType;

	let result: Omit<GradeResult, 'questionId'>;

	switch (questionType) {
		case 'single_choice':
		case 'true_false':
			result = gradeSingleChoice(
				answer.answer as number,
				question.config as SingleChoiceConfig | TrueFalseConfig,
				points,
				question.explanation
			);
			break;

		case 'multiple_choice':
			result = gradeMultipleChoice(
				answer.answer as number[] | Set<number>,
				question.config as MultipleChoiceConfig,
				points,
				question.explanation
			);
			break;

		case 'short_answer':
			result = gradeShortAnswer(
				answer.answer as string,
				question.config as ShortAnswerConfig,
				points,
				question.explanation
			);
			break;

		case 'fill_blank':
			result = gradeFillBlank(
				answer.answer as Record<number, string>,
				question.config as FillBlankConfig,
				points,
				question.explanation
			);
			break;

		case 'matching':
			result = gradeMatching(
				answer.answer as Record<string, string>,
				question.config as MatchingConfig,
				points,
				question.explanation
			);
			break;

		case 'numeric':
			result = gradeNumeric(
				answer.answer as number | string,
				question.config as any,
				points,
				question.explanation
			);
			break;

		case 'text_only':
			// text_only questions are not graded
			result = {
				isCorrect: true,
				pointsEarned: 0,
				pointsPossible: 0,
				explanation: null
			};
			break;

		default:
			result = {
				isCorrect: false,
				pointsEarned: 0,
				pointsPossible: points,
				explanation: question.explanation || null
			};
	}

	return {
		questionId: question.id,
		...result
	};
}

/**
 * Grade all questions in a submission
 */
export function gradeSubmission(
	questions: QuestionData[],
	answers: QuestionAnswer[]
): {
	results: GradeResult[];
	totalPoints: number;
	earnedPoints: number;
	percentage: number;
} {
	const answerMap = new Map<string, QuestionAnswer>();
	for (const ans of answers) {
		answerMap.set(ans.questionId, ans);
	}

	const results: GradeResult[] = [];
	let totalPoints = 0;
	let earnedPoints = 0;

	for (const question of questions) {
		if (question.questionType === 'text_only') continue; // Skip text-only

		const answer = answerMap.get(question.id) || {
			questionId: question.id,
			questionType: question.questionType,
			answer: undefined
		};

		const result = gradeQuestion(question, answer);
		results.push(result);

		totalPoints += result.pointsPossible;
		earnedPoints += result.pointsEarned;
	}

	const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

	return {
		results,
		totalPoints,
		earnedPoints,
		percentage: Math.round(percentage * 100) / 100
	};
}
