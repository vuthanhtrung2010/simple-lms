import { hasPermission, UserPermissions } from '$lib/permissions.js';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { problems, questions, categories, types, problemTypes } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { BaseQuestion } from '$lib/../types.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	// Check authentication
	if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM)) {
		error(403, 'You do not have permission to manage problems.');
	}

	const problemId = params.id;
	if (!problemId) {
		error(400, 'Problem ID is required');
	}

	const db = locals.db;

	// Fetch problem with existence check
	const problem = await db
		.select({
			id: problems.id,
			title: problems.title,
			description: problems.description,
			instructions: problems.instructions,
			media: problems.media,
			timeLimit: problems.timeLimit,
			attemptsAllowed: problems.attemptsAllowed,
			showAnswers: problems.showAnswers,
			shuffleQuestions: problems.shuffleQuestions,
			splitScreen: problems.splitScreen,
			categoryId: problems.categoryId,
			createdBy: problems.createdBy,
			rating: problems.rating
		})
		.from(problems)
		.where(eq(problems.id, Number(problemId)))
		.get();

	if (!problem) {
		error(404, 'Problem not found');
	}

	// Check permission: user must be creator or have EDIT_ANY_PROBLEM permission
	const canEditAny = hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM);
	if (!canEditAny && problem.createdBy !== locals.user.id) {
		error(403, 'You do not have permission to edit this problem');
	}

	// Fetch problem types
	const problemTypesList = await db
		.select({
			typeId: problemTypes.typeId
		})
		.from(problemTypes)
		.where(eq(problemTypes.problemId, String(problemId)))
		.all();

	// Fetch all categories and types for dropdowns
	const allCategories = await db.select().from(categories).all();
	const allTypes = await db.select().from(types).all();

	// Fetch all questions for this problem
	const questionsList = await db
		.select({
			id: questions.id,
			questionType: questions.questionType,
			questionText: questions.questionText,
			explanation: questions.explanation,
			points: questions.points,
			orderIndex: questions.orderIndex,
			isRequired: questions.isRequired,
			config: questions.config,
			media: questions.media
		})
		.from(questions)
		.where(eq(questions.problemId, String(problemId)))
		.orderBy(questions.orderIndex)
		.all();

	// Parse JSON fields
	const parsedQuestions = questionsList.map((q) => ({
		...q,
		config: typeof q.config === 'string' ? JSON.parse(q.config) : q.config,
		media: typeof q.media === 'string' ? JSON.parse(q.media) : q.media
	}));

	const parsedProblem = {
		...problem,
		media: typeof problem.media === 'string' ? JSON.parse(problem.media) : problem.media
	};

	return {
		problem: parsedProblem,
		problemTypes: problemTypesList.map((pt) => pt.typeId),
		categories: allCategories,
		types: allTypes,
		questions: parsedQuestions
	};
};

export const actions = {
	updateMetadata: async ({ locals, request, params }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM)) {
			return fail(403, { error: 'You do not have permission to perform this action.' });
		}

		const data = await request.formData();
		const problemId = params.id;
		const title = data.get('title') as string;
		const description = data.get('description') as string;
		const instructions = data.get('instructions') as string;
		const categoryId = data.get('categoryId') as string;
		const typeIds = data.getAll('types') as string[];
		const attemptsAllowed = data.get('attemptsAllowed') as string;
		const showAnswers = data.get('showAnswers') as string;
		const shuffleQuestions = data.get('shuffleQuestions') === 'on';
		const splitScreen = data.get('splitScreen') === 'on';
		const timeLimit = data.get('timeLimit') as string;

		// Validate required fields
		if (!title || title.trim().length === 0) {
			return fail(400, { error: 'Title is required' });
		}

		if (!categoryId) {
			return fail(400, { error: 'Category is required' });
		}

		if (!typeIds || typeIds.length === 0) {
			return fail(400, { error: 'At least one type is required' });
		}

		const db = locals.db;

		// Check if problem exists
		const problem = await db
			.select({ id: problems.id, createdBy: problems.createdBy })
			.from(problems)
			.where(eq(problems.id, Number(problemId)))
			.get();

		if (!problem) {
			return fail(404, { error: 'Problem not found' });
		}

		// Check permission
		const canEditAny = hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM);
		if (!canEditAny && problem.createdBy !== locals.user.id) {
			return fail(403, { error: 'You do not have permission to edit this problem' });
		}

		try {
			// Update problem metadata
			await db
				.update(problems)
				.set({
					title,
					description,
					instructions: instructions || null,
					categoryId: Number(categoryId),
					attemptsAllowed: attemptsAllowed ? Number(attemptsAllowed) : -1,
					showAnswers,
					shuffleQuestions,
					splitScreen,
					timeLimit: timeLimit ? Number(timeLimit) : null
				})
				.where(eq(problems.id, Number(problemId)))
				.run();

			// Update problem types
			// Delete existing types
			await db.delete(problemTypes).where(eq(problemTypes.problemId, problemId)).run();

			// Insert new types
			if (typeIds.length > 0) {
				await db
					.insert(problemTypes)
					.values(
						typeIds.map((typeId) => ({
							problemId: problemId,
							typeId: Number(typeId)
						}))
					)
					.run();
			}

			// Invalidate KV caches
			await locals.kv.delete('adminProblems');

			return { success: true, message: 'Problem metadata updated successfully' };
		} catch (e) {
			console.error('Error updating problem metadata:', e);
			return fail(500, { error: 'Failed to update problem metadata' });
		}
	},

	updateQuestion: async ({ locals, request, params }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM)) {
			return fail(403, { error: 'You do not have permission to perform this action.' });
		}

		const data = await request.formData();
		const problemId = params.id;
		const questionId = data.get('questionId') as string;
		const questionData = data.get('questionData') as string;

		if (!questionId || !questionData) {
			return fail(400, { error: 'Missing required fields' });
		}

		const db = locals.db;

		// Check if problem exists and user has permission
		const problem = await db
			.select({ id: problems.id, createdBy: problems.createdBy })
			.from(problems)
			.where(eq(problems.id, Number(problemId)))
			.get();

		if (!problem) {
			return fail(404, { error: 'Problem not found' });
		}

		const canEditAny = hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM);
		if (!canEditAny && problem.createdBy !== locals.user.id) {
			return fail(403, { error: 'You do not have permission to edit this problem' });
		}

		try {
			const parsedQuestion = JSON.parse(questionData) as BaseQuestion;

			// Validate question data
			if (!parsedQuestion.questionType || !parsedQuestion.questionText) {
				return fail(400, { error: 'Invalid question data' });
			}

			// Update question
			await db
				.update(questions)
				.set({
					questionType: parsedQuestion.questionType,
					questionText: parsedQuestion.questionText,
					explanation: parsedQuestion.explanation || null,
					points: parsedQuestion.points ?? 0,
					orderIndex: parsedQuestion.orderIndex,
					config: parsedQuestion.config as any,
					media: parsedQuestion.media as any
				})
				.where(eq(questions.id, questionId))
				.run();

			// Recalculate problem points
			const totalPoints = await db
				.select({ total: sql<number>`SUM(${questions.points})` })
				.from(questions)
				.where(eq(questions.problemId, problemId))
				.get();

			await db
				.update(problems)
				.set({ points: totalPoints?.total || 0 })
				.where(eq(problems.id, Number(problemId)))
				.run();

			return { success: true, message: 'Question updated successfully' };
		} catch (e) {
			console.error('Error updating question:', e);
			return fail(500, { error: 'Failed to update question: ' + String(e) });
		}
	},

	addQuestion: async ({ locals, request, params }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM)) {
			return fail(403, { error: 'You do not have permission to perform this action.' });
		}

		const data = await request.formData();
		const problemId = params.id;
		const questionData = data.get('questionData') as string;

		if (!questionData) {
			return fail(400, { error: 'Missing required fields' });
		}

		const db = locals.db;

		// Check if problem exists and user has permission
		const problem = await db
			.select({ id: problems.id, createdBy: problems.createdBy })
			.from(problems)
			.where(eq(problems.id, Number(problemId)))
			.get();

		if (!problem) {
			return fail(404, { error: 'Problem not found' });
		}

		const canEditAny = hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM);
		if (!canEditAny && problem.createdBy !== locals.user.id) {
			return fail(403, { error: 'You do not have permission to edit this problem' });
		}

		try {
			const parsedQuestion = JSON.parse(questionData) as BaseQuestion;

			// Validate question data
			if (!parsedQuestion.questionType || !parsedQuestion.questionText) {
				return fail(400, { error: 'Invalid question data' });
			}

			// Insert new question
			await db
				.insert(questions)
				.values({
					problemId: problemId,
					questionType: parsedQuestion.questionType,
					questionText: parsedQuestion.questionText,
					explanation: parsedQuestion.explanation || null,
					points: parsedQuestion.points ?? 0,
					orderIndex: parsedQuestion.orderIndex,
					isRequired: true,
					config: parsedQuestion.config as any,
					media: parsedQuestion.media as any
				})
				.run();

			// Recalculate problem points
			const totalPoints = await db
				.select({ total: sql<number>`SUM(${questions.points})` })
				.from(questions)
				.where(eq(questions.problemId, problemId))
				.get();

			await db
				.update(problems)
				.set({ points: totalPoints?.total || 0 })
				.where(eq(problems.id, Number(problemId)))
				.run();

			return { success: true, message: 'Question added successfully' };
		} catch (e) {
			console.error('Error adding question:', e);
			return fail(500, { error: 'Failed to add question: ' + String(e) });
		}
	},

	deleteQuestion: async ({ locals, request, params }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM)) {
			return fail(403, { error: 'You do not have permission to perform this action.' });
		}

		const data = await request.formData();
		const problemId = params.id;
		const questionId = data.get('questionId') as string;

		if (!questionId) {
			return fail(400, { error: 'Missing required fields' });
		}

		const db = locals.db;

		// Check if problem exists and user has permission
		const problem = await db
			.select({ id: problems.id, createdBy: problems.createdBy })
			.from(problems)
			.where(eq(problems.id, Number(problemId)))
			.get();

		if (!problem) {
			return fail(404, { error: 'Problem not found' });
		}

		const canEditAny = hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM);
		if (!canEditAny && problem.createdBy !== locals.user.id) {
			return fail(403, { error: 'You do not have permission to edit this problem' });
		}

		try {
			// Delete question
			await db.delete(questions).where(eq(questions.id, questionId)).run();

			// Recalculate problem points
			const totalPoints = await db
				.select({ total: sql<number>`SUM(${questions.points})` })
				.from(questions)
				.where(eq(questions.problemId, problemId))
				.get();

			await db
				.update(problems)
				.set({ points: totalPoints?.total || 0 })
				.where(eq(problems.id, Number(problemId)))
				.run();

			return { success: true, message: 'Question deleted successfully' };
		} catch (e) {
			console.error('Error deleting question:', e);
			return fail(500, { error: 'Failed to delete question' });
		}
	}
} satisfies Actions;
