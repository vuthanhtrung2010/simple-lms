import type { PageServerLoad, Actions } from './$types.js';
import { error, redirect } from '@sveltejs/kit';
import { and, desc, eq, max, sql } from 'drizzle-orm';
import {
	courses,
	courseProblems,
	problems,
	questions,
	enrollments,
	submissions,
	questionAnswers,
	problemTypes,
	typeRatings
} from '$lib/server/db/schema.js';
import { processMarkdownToHtml } from '$lib/markdown-processor.js';
import { gradeSubmission } from '$lib/grader.js';
import type { QuestionData, QuestionAnswer } from '$lib/grader.js';
import { updateRatings, updateTypeRating } from '$lib/elo.js';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { courseId, problemId } = params;

	// Require authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const db = locals.db;

	// Ensure course exists
	const course = await db
		.select({ id: courses.id, title: courses.title })
		.from(courses)
		.where(and(eq(courses.id, courseId), eq(courses.isDeleted, false)))
		.get();

	if (!course) {
		error(404, 'Course not found');
	}

	// Ensure current user is enrolled in this course
	const enrollment = await db
		.select({ id: enrollments.id })
		.from(enrollments)
		.where(
			and(
				eq(enrollments.courseId, courseId),
				eq(enrollments.userId, locals.user.id!),
				eq(enrollments.isDeleted, false)
			)
		)
		.get();

	if (!enrollment) {
		error(403, 'You are not enrolled in this course');
	}

	// Ensure problemId is numeric and problem exists
	const problemIdNum = Number(problemId);
	if (!Number.isInteger(problemIdNum)) {
		error(404, 'Problem not found');
	}

	// Ensure problem is linked to course
	const link = await db
		.select({ problemId: courseProblems.problemId })
		.from(courseProblems)
		.where(and(eq(courseProblems.courseId, courseId), eq(courseProblems.problemId, problemId)))
		.get();

	if (!link) {
		error(404, 'Problem not found in this course');
	}

	// Fetch basic problem info (for timer / metadata if needed)
	const problem = await db
		.select({
			id: problems.id,
			title: problems.title,
			timeLimit: problems.timeLimit,
			description: problems.description,
			media: problems.media,
			splitScreen: problems.splitScreen
		})
		.from(problems)
		.where(eq(problems.id, problemIdNum))
		.get();

	if (!problem) {
		error(404, 'Problem not found');
	}

	// Build current origin for media URLs (fallback to window-like origin based on request URL)
	const origin = url.origin;
	const baseFileUrl = `${origin}/file`;

	// Load all questions for this problem
	const rawQuestions = await db
		.select({
			id: questions.id,
			questionType: questions.questionType,
			questionText: questions.questionText,
			config: questions.config,
			media: questions.media,
			orderIndex: questions.orderIndex,
			points: questions.points
		})
		.from(questions)
		.where(eq(questions.problemId, String(problem.id)))
		.orderBy(questions.orderIndex)
		.all();

	// Helper to append media markdown/audio HTML to question text or option texts
	function appendMediaToText(text: string, mediaItems: unknown[]): string {
		if (!mediaItems || !Array.isArray(mediaItems)) return text;

		let result = text;
		for (const m of mediaItems) {
			if (!m) continue;
			const url =
				typeof m === 'string' ? m : typeof m === 'object' && 'url' in m ? (m as any).url : null;
			if (!url || typeof url !== 'string') continue;

			const lower = url.toLowerCase();
			if (lower.endsWith('.mp3') || lower.endsWith('.wav')) {
				// Append audio player HTML
				result += `\n\n<audio controls>\n  <source src="${baseFileUrl}/${url}" type="audio/mpeg" />\n  Your browser does not support the audio element.\n</audio>`;
			} else if (
				lower.endsWith('.jpg') ||
				lower.endsWith('.jpeg') ||
				lower.endsWith('.png') ||
				lower.endsWith('.gif')
			) {
				// Append markdown image
				result += `\n\n![](${baseFileUrl}/${url})`;
			}
		}
		return result;
	}

	// Normalize questions: keep raw/augmented config for UI, and render question text HTML
	const questionsHtml = await Promise.all(
		rawQuestions.map(async (q) => {
			// Start from base question text
			let textWithMedia = q.questionText;

			// Attach top-level media if present
			if (q.media) {
				textWithMedia = appendMediaToText(textWithMedia, q.media as unknown[]);
			}

			// Parse config if it's a string (Drizzle sometimes doesn't auto-parse)
			let parsedConfig: any = q.config;
			if (typeof q.config === 'string') {
				try {
					parsedConfig = JSON.parse(q.config);
				} catch (e) {
					console.error('Failed to parse config for question', q.id, e);
					parsedConfig = null;
				}
			}

			// For choice-based questions, also append media for each option if any
			let renderedConfig: any = parsedConfig ?? {};

			if (
				(q.questionType === 'single_choice' ||
					q.questionType === 'multiple_choice' ||
					q.questionType === 'true_false') &&
				renderedConfig &&
				typeof renderedConfig === 'object' &&
				Array.isArray(renderedConfig.options)
			) {
				const newOptions = renderedConfig.options.map((opt: any) => {
					let optText = String(opt.text ?? '');
					if (opt.media && Array.isArray(opt.media)) {
						optText = appendMediaToText(optText, opt.media);
					}
					return { ...opt, text: optText };
				});
				renderedConfig = { ...renderedConfig, options: newOptions };
			}

			// For fill_blank: replace ____(n)____ with placeholder token {{blank:n}} BEFORE markdown
			if (q.questionType === 'fill_blank') {
				textWithMedia = textWithMedia.replace(/____\((\d+)\)____/g, '{{blank:$1}}');
			}

			// For matching: append choices table as markdown
			if (
				q.questionType === 'matching' &&
				renderedConfig?.choices &&
				Array.isArray(renderedConfig.choices)
			) {
				textWithMedia += '\n\n**Choices:**\n\n';
				textWithMedia += '| Choice | Description |\n';
				textWithMedia += '|--------|-------------|\n';
				for (const choice of renderedConfig.choices) {
					textWithMedia += `| **${choice.id}** | ${choice.text} |\n`;
				}
			}

			// Render main question text (with appended media) to HTML
			const html = await processMarkdownToHtml(textWithMedia);

			return {
				id: q.id,
				questionType: q.questionType,
				orderIndex: q.orderIndex,
				points: q.points,
				config: renderedConfig,
				questionHtml: html
			};
		})
	);

	// Find existing in-progress submission for this user & problem
	const existing = await db
		.select({
			id: submissions.id,
			startedAt: submissions.startedAt
		})
		.from(submissions)
		.where(
			and(
				eq(submissions.userId, locals.user.id!),
				eq(submissions.problemId, String(problem.id)),
				eq(submissions.status, 'in_progress')
			)
		)
		.orderBy(desc(submissions.startedAt))
		.get();

	const now = Date.now();
	let submissionId: string;
	let startedAt: number;
	let elapsedSeconds: number;

	if (existing) {
		// Resume existing attempt
		submissionId = existing.id;
		startedAt = existing.startedAt;
		elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
	} else {
		// Compute next attempt number
		const lastAttempt = await db
			.select({ attempt: max(submissions.attemptNumber).as('attempt') })
			.from(submissions)
			.where(
				and(eq(submissions.userId, locals.user.id!), eq(submissions.problemId, String(problem.id)))
			)
			.get();

		const attemptNumber = (lastAttempt?.attempt ?? 0) + 1;

		// Create new in-progress submission
		const inserted = await db
			.insert(submissions)
			.values({
				userId: locals.user.id!,
				problemId: String(problem.id),
				attemptNumber,
				status: 'in_progress',
				startedAt: now,
				maxScore: 0 // will be updated after grading or based on points sum
			})
			.returning({ id: submissions.id, startedAt: submissions.startedAt })
			.get();

		submissionId = inserted.id;
		startedAt = inserted.startedAt;
		elapsedSeconds = 0;
	}

	// Process description with media
	let descriptionHtml = '';
	if (problem.description) {
		let descWithMedia = problem.description;

		// Append media if present (>= 2 audios or any images)
		if (problem.media && Array.isArray(problem.media) && problem.media.length > 0) {
			const mediaArray = problem.media as unknown[];
			const audioCount = mediaArray.filter((m: any) => {
				const url = typeof m === 'string' ? m : m?.url;
				if (!url) return false;
				const lower = String(url).toLowerCase();
				return lower.endsWith('.mp3') || lower.endsWith('.wav');
			}).length;

			// Only append if >= 2 audios
			if (audioCount >= 2) {
				descWithMedia = appendMediaToText(descWithMedia, mediaArray);
			} else {
				// Append non-audio media (images)
				const nonAudioMedia = mediaArray.filter((m: any) => {
					const url = typeof m === 'string' ? m : m?.url;
					if (!url) return false;
					const lower = String(url).toLowerCase();
					return !(lower.endsWith('.mp3') || lower.endsWith('.wav'));
				});
				if (nonAudioMedia.length > 0) {
					descWithMedia = appendMediaToText(descWithMedia, nonAudioMedia);
				}
			}
		}

		descriptionHtml = await processMarkdownToHtml(descWithMedia);
	}

	// Separate text_only questions from interactive questions
	const textOnlyQuestions = questionsHtml.filter((q) => q.questionType === 'text_only');
	const interactiveQuestions = questionsHtml.filter((q) => q.questionType !== 'text_only');

	return {
		course,
		problem: {
			id: problem.id,
			title: problem.title,
			timeLimit: problem.timeLimit,
			descriptionHtml,
			splitScreen: problem.splitScreen ?? false
		},
		questions: questionsHtml,
		textOnlyQuestions,
		interactiveQuestions,
		submission: {
			id: submissionId,
			startedAt,
			elapsedSeconds,
			// Expose time limit (in minutes) for client timer; 0/undefined means unlimited
			timeLimit: problem.timeLimit ?? null
		}
	};
};

export const actions: Actions = {
	submit: async ({ params, request, locals }) => {
		const { courseId, problemId } = params;

		// Require authentication
		if (!locals.user) {
			error(401, 'Unauthorized');
		}

		const db = locals.db;
		const formData = await request.formData();

		// Get submission ID
		const submissionId = formData.get('submissionId') as string;
		if (!submissionId) {
			error(400, 'Missing submission ID');
		}

		// Get submission
		const submission = await db
			.select({
				id: submissions.id,
				userId: submissions.userId,
				problemId: submissions.problemId,
				status: submissions.status,
				attemptNumber: submissions.attemptNumber,
				startedAt: submissions.startedAt
			})
			.from(submissions)
			.where(eq(submissions.id, submissionId))
			.get();

		if (!submission) {
			error(404, 'Submission not found');
		}

		if (submission.userId !== locals.user.id) {
			error(403, 'Not your submission');
		}

		if (submission.status !== 'in_progress') {
			error(400, 'Submission already submitted');
		}

		// Load all questions with their configs
		const rawQuestions = await db
			.select({
				id: questions.id,
				questionType: questions.questionType,
				config: questions.config,
				points: questions.points,
				explanation: questions.explanation
			})
			.from(questions)
			.where(eq(questions.problemId, submission.problemId))
			.all();

		// Parse configs
		const parsedQuestions: QuestionData[] = rawQuestions.map((q) => {
			let parsedConfig = q.config;
			if (typeof q.config === 'string') {
				try {
					parsedConfig = JSON.parse(q.config);
				} catch (e) {
					parsedConfig = null;
				}
			}
			return {
				id: q.id,
				questionType: q.questionType as any,
				config: parsedConfig,
				points: q.points ?? 0,
				explanation: q.explanation ?? undefined
			};
		});

		// Extract answers from form data
		const answers: QuestionAnswer[] = [];

		for (const q of parsedQuestions) {
			if (q.questionType === 'text_only') continue;

			let answer: any = undefined;

			if (q.questionType === 'single_choice' || q.questionType === 'true_false') {
				const value = formData.get(`q-${q.id}`);
				if (value !== null) {
					answer = parseInt(value as string);
				}
			} else if (q.questionType === 'multiple_choice') {
				const values = formData.getAll(`mc-${q.id}`);
				answer = values.map((v) => parseInt(v as string));
			} else if (q.questionType === 'short_answer') {
				answer = formData.get(`short-${q.id}`) as string;
			} else if (q.questionType === 'numeric') {
				const value = formData.get(`numeric-${q.id}`);
				if (value !== null && value !== '') {
					answer = parseFloat(value as string);
				}
			} else if (q.questionType === 'fill_blank') {
				// Collect all blanks for this question
				answer = {};
				const blankConfig = q.config as any;
				if (blankConfig?.blanks) {
					for (const blank of blankConfig.blanks) {
						const value = formData.get(`blank-${q.id}-${blank.index}`);
						if (value !== null) {
							answer[blank.index] = value as string;
						}
					}
				}
			} else if (q.questionType === 'matching') {
				// Collect all matches for this question
				answer = {};
				const matchConfig = q.config as any;
				if (matchConfig?.items) {
					for (const item of matchConfig.items) {
						const value = formData.get(`matching-${q.id}-${item.text}`);
						if (value !== null) {
							answer[item.text] = value as string;
						}
					}
				}
			}

			answers.push({
				questionId: q.id,
				questionType: q.questionType as any,
				answer
			});
		}

		// Grade the submission
		const gradeResults = gradeSubmission(parsedQuestions, answers);

		// Save question answers
		for (const result of gradeResults.results) {
			const answerData = answers.find((a) => a.questionId === result.questionId);

			// First, try to find existing answer
			const existingAnswer = await db
				.select({ id: questionAnswers.id })
				.from(questionAnswers)
				.where(
					and(
						eq(questionAnswers.submissionId, submission.id),
						eq(questionAnswers.questionId, result.questionId)
					)
				)
				.get();

			if (existingAnswer) {
				// Update existing
				await db
					.update(questionAnswers)
					.set({
						answerData: answerData?.answer ?? null,
						isCorrect: result.isCorrect,
						pointsEarned: result.pointsEarned,
						pointsPossible: result.pointsPossible,
						feedback: result.feedback ?? null,
						answeredAt: Date.now()
					})
					.where(eq(questionAnswers.id, existingAnswer.id));
			} else {
				// Insert new
				await db.insert(questionAnswers).values({
					submissionId: submission.id,
					questionId: result.questionId,
					answerData: answerData?.answer ?? null,
					isCorrect: result.isCorrect,
					pointsEarned: result.pointsEarned,
					pointsPossible: result.pointsPossible,
					autoGraded: true,
					feedback: result.feedback ?? null
				});
			}
		}

		// Only update ratings on first attempt
		if (submission.attemptNumber === 1) {
			// Get problem info for rating
			const problemInfo = await db
				.select({
					id: problems.id,
					rating: problems.rating
				})
				.from(problems)
				.where(eq(problems.id, parseInt(submission.problemId)))
				.get();

			if (!problemInfo) {
				error(404, 'Problem not found');
			}

			// Get user's submission count for this course (for rating calculation)
			const userSubmissionCount = await db
				.select({ count: sql<number>`count(*)` })
				.from(submissions)
				.where(and(eq(submissions.userId, locals.user.id!), eq(submissions.status, 'submitted')))
				.get();

			// Get problem's total submission count
			const problemSubmissionCount = await db
				.select({ count: sql<number>`count(*)` })
				.from(submissions)
				.where(
					and(eq(submissions.problemId, submission.problemId), eq(submissions.status, 'submitted'))
				)
				.get();

			// Calculate user accuracy
			const userAccuracy =
				gradeResults.totalPoints > 0 ? gradeResults.earnedPoints / gradeResults.totalPoints : 0;

			// Update ratings (we'll assume user starts at 1500 if no rating system exists yet)
			const userCurrentRating = 1500; // TODO: fetch from user table if you add rating field
			const { newProblemRating } = updateRatings(
				userCurrentRating,
				problemInfo.rating,
				userAccuracy,
				(userSubmissionCount?.count ?? 0) + 1,
				(problemSubmissionCount?.count ?? 0) + 1
			);

			// Update problem rating
			await db
				.update(problems)
				.set({ rating: newProblemRating })
				.where(eq(problems.id, problemInfo.id));

			// Get problem types
			const problemTypesList = await db
				.select({ typeId: problemTypes.typeId })
				.from(problemTypes)
				.where(eq(problemTypes.problemId, String(problemInfo.id)))
				.all();

			// Update type ratings for each type
			for (const pt of problemTypesList) {
				// Get current type rating for user
				const currentTypeRating = await db
					.select({
						rating: typeRatings.rating,
						submissionCount: typeRatings.submissionCount
					})
					.from(typeRatings)
					.where(
						and(
							eq(typeRatings.userId, locals.user.id!),
							eq(typeRatings.courseId, courseId),
							eq(typeRatings.typeId, pt.typeId)
						)
					)
					.get();

				if (currentTypeRating) {
					// Update existing rating
					const { newRating } = updateTypeRating(
						currentTypeRating.rating,
						userAccuracy,
						currentTypeRating.submissionCount + 1
					);

					await db
						.update(typeRatings)
						.set({
							rating: newRating,
							submissionCount: currentTypeRating.submissionCount + 1
						})
						.where(
							and(
								eq(typeRatings.userId, locals.user.id!),
								eq(typeRatings.courseId, courseId),
								eq(typeRatings.typeId, pt.typeId)
							)
						);
				} else {
					// Create new rating
					const { newRating } = updateTypeRating(1500, userAccuracy, 1);

					await db.insert(typeRatings).values({
						userId: locals.user.id!,
						courseId,
						typeId: pt.typeId,
						rating: newRating,
						submissionCount: 1
					});
				}
			}
		}

		// Update submission status to graded (since it's auto-graded)
		const now = Date.now();
		const timeSpent = Math.floor((now - submission.startedAt) / 1000);

		await db
			.update(submissions)
			.set({
				status: 'graded',
				score: gradeResults.earnedPoints,
				maxScore: gradeResults.totalPoints,
				scorePercentage: gradeResults.percentage,
				submittedAt: now,
				gradedAt: now,
				timeSpent,
				autoGraded: true
			})
			.where(eq(submissions.id, submission.id));

		// Redirect to result page
		redirect(
			303,
			`/course/${courseId}/problem/${problemId}/result?attempt=${submission.attemptNumber}`
		);
	}
};
