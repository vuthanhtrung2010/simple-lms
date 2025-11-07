import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import {
	courses,
	courseProblems,
	problems,
	categories,
	problemTypes,
	types,
	enrollments
} from '$lib/server/db/schema.js';
import { processMarkdownToHtml } from '$lib/markdown-processor.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { courseId, problemId } = params;

	// Require authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const db = locals.db;

	// Ensure course exists
	const course = await db
		.select({ id: courses.id, title: courses.title })
		.from(courses)
		.where(eq(courses.id, courseId))
		.get();

	if (!course) {
		throw error(404, 'Course not found');
	}

	// Ensure current user is enrolled in this course (student/teacher/supervisor)
	const enrollment = await db
		.select({ id: enrollments.id })
		.from(enrollments)
		.where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, locals.user.id!)))
		.get();

	if (!enrollment) {
		throw error(403, 'You are not enrolled in this course');
	}

	// Ensure problemId is numeric (problems.id is integer)
	const problemIdNum = Number(problemId);
	if (!Number.isInteger(problemIdNum)) {
		throw error(404, 'Problem not found');
	}

	// Ensure problem is linked to course
	const courseProblem = await db
		.select({ problemId: courseProblems.problemId })
		.from(courseProblems)
		.where(and(eq(courseProblems.courseId, courseId), eq(courseProblems.problemId, problemId)))
		.get();

	if (!courseProblem) {
		throw error(404, 'Problem not found in this course');
	}

	// Fetch problem with metadata
	const problem = await db
		.select({
			id: problems.id,
			title: problems.title,
			description: problems.description,
			timeLimit: problems.timeLimit,
			attemptsAllowed: problems.attemptsAllowed,
			showAnswers: problems.showAnswers,
			shuffleQuestions: problems.shuffleQuestions,
			splitScreen: problems.splitScreen,
			rating: problems.rating,
			categoryId: problems.categoryId
		})
		.from(problems)
		.where(eq(problems.id, problemIdNum))
		.get();

	if (!problem) {
		throw error(404, 'Problem not found');
	}

	// Pre-render markdown description on the server
	const descriptionHtml = problem.description
		? await processMarkdownToHtml(problem.description)
		: '<p class="text-muted-foreground">No description available.</p>';

	// Load category name
	const category = await db
		.select({ id: categories.id, name: categories.name })
		.from(categories)
		.where(eq(categories.id, problem.categoryId))
		.get();

	// Load problem types (names)
	const typeRows = await db
		.select({ typeId: problemTypes.typeId, typeName: types.name })
		.from(problemTypes)
		.innerJoin(types, eq(types.id, problemTypes.typeId))
		.where(eq(problemTypes.problemId, String(problem.id)))
		.all();

	const problemTypesList = typeRows.map((t) => t.typeName);

	return {
		course,
		problem: {
			...problem,
			categoryName: category?.name ?? null,
			types: problemTypesList,
			descriptionHtml
		}
	};
};
