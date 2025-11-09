import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { eq, and, inArray, sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/accounts/login');
	}

	const db = locals.db;
	const userId = locals.user.id;

	// Fetch user's enrollments
	const enrollments = await db
		.select({
			courseId: schema.enrollments.courseId,
			courseTitle: schema.courses.title,
			role: schema.enrollments.role
		})
		.from(schema.enrollments)
		.innerJoin(schema.courses, eq(schema.enrollments.courseId, schema.courses.id))
		.where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.isDeleted, false)))
		.all();

	if (enrollments.length === 0) {
		// User has no courses
		throw redirect(302, '/');
	}

	const userCourses = enrollments.map((e) => ({
		id: e.courseId,
		title: e.courseTitle
	}));

	// Sort courses alphabetically
	userCourses.sort((a, b) => a.title.localeCompare(b.title));

	// Determine which course to show
	const selectedCourseParam = url.searchParams.get('course');
	let selectedCourseId: string | null = null;

	if (selectedCourseParam === 'all') {
		selectedCourseId = 'all';
	} else if (selectedCourseParam && userCourses.some((c) => c.id === selectedCourseParam)) {
		selectedCourseId = selectedCourseParam;
	} else if (userCourses.length === 1) {
		// Only one course, select it
		selectedCourseId = userCourses[0].id;
	} else {
		// Multiple courses, default to first alphabetically
		selectedCourseId = userCourses[0].id;
	}

	// Fetch problems based on selected course
	let problemsQuery;
	const courseIds = userCourses.map((c) => c.id);

	if (selectedCourseId === 'all') {
		// Fetch all problems from all user's courses
		problemsQuery = db
			.select({
				id: schema.problems.id,
				title: schema.problems.title,
				description: schema.problems.description,
				rating: schema.problems.rating,
				categoryId: schema.problems.categoryId,
				categoryName: schema.categories.name,
				courseId: schema.courseProblems.courseId,
				courseTitle: schema.courses.title
			})
			.from(schema.problems)
			.innerJoin(schema.courseProblems, eq(schema.problems.id, schema.courseProblems.problemId))
			.innerJoin(schema.courses, eq(schema.courseProblems.courseId, schema.courses.id))
			.innerJoin(schema.categories, eq(schema.problems.categoryId, schema.categories.id))
			.where(inArray(schema.courseProblems.courseId, courseIds));
	} else {
		// Fetch problems for selected course
		problemsQuery = db
			.select({
				id: schema.problems.id,
				title: schema.problems.title,
				description: schema.problems.description,
				rating: schema.problems.rating,
				categoryId: schema.problems.categoryId,
				categoryName: schema.categories.name,
				courseId: schema.courseProblems.courseId,
				courseTitle: schema.courses.title
			})
			.from(schema.problems)
			.innerJoin(schema.courseProblems, eq(schema.problems.id, schema.courseProblems.problemId))
			.innerJoin(schema.courses, eq(schema.courseProblems.courseId, schema.courses.id))
			.innerJoin(schema.categories, eq(schema.problems.categoryId, schema.categories.id))
			.where(eq(schema.courseProblems.courseId, selectedCourseId));
	}

	const problemsData = await problemsQuery.all();

	// Fetch problem types for each problem
	const problemIds = problemsData.map((p) => String(p.id));

	// Fetch total points for each problem (sum of all question points)
	const pointsData = problemIds.length
		? await db
				.select({
					problemId: schema.questions.problemId,
					totalPoints: sql<number>`SUM(${schema.questions.points})`
				})
				.from(schema.questions)
				.where(inArray(schema.questions.problemId, problemIds))
				.groupBy(schema.questions.problemId)
				.all()
		: [];

	// Build points map
	const pointsMap = new Map<string, number>();
	for (const p of pointsData) {
		pointsMap.set(p.problemId, p.totalPoints || 0);
	}
	const problemTypesData = problemIds.length
		? await db
				.select({
					problemId: schema.problemTypes.problemId,
					typeName: schema.types.name
				})
				.from(schema.problemTypes)
				.innerJoin(schema.types, eq(schema.problemTypes.typeId, schema.types.id))
				.where(inArray(schema.problemTypes.problemId, problemIds))
				.all()
		: [];

	// Fetch user submissions to determine status
	const submissionsData = problemIds.length
		? await db
				.select({
					problemId: schema.submissions.problemId,
					score: schema.submissions.score,
					maxScore: schema.submissions.maxScore,
					status: schema.submissions.status
				})
				.from(schema.submissions)
				.where(
					and(
						eq(schema.submissions.userId, userId),
						inArray(schema.submissions.problemId, problemIds)
					)
				)
				.all()
		: [];

	// Build problem type map
	const problemTypeMap = new Map<string, string[]>();
	for (const pt of problemTypesData) {
		if (!problemTypeMap.has(pt.problemId)) {
			problemTypeMap.set(pt.problemId, []);
		}
		problemTypeMap.get(pt.problemId)!.push(pt.typeName);
	}

	// Build submission status map
	const submissionStatusMap = new Map<string, { solved: boolean; attempted: boolean }>();
	for (const sub of submissionsData) {
		const existing = submissionStatusMap.get(sub.problemId);
		const solved = sub.score === sub.maxScore;
		const attempted = true;

		if (!existing) {
			submissionStatusMap.set(sub.problemId, { solved, attempted });
		} else {
			// Update if this submission is better
			if (solved) {
				existing.solved = true;
			}
		}
	}

	// Build problems array
	const problems = problemsData.map((p) => ({
		id: String(p.id),
		name: p.title,
		category: p.categoryName,
		points: pointsMap.get(String(p.id)) || 0,
		rating: p.rating,
		type: problemTypeMap.get(String(p.id)) || [],
		status: submissionStatusMap.get(String(p.id)),
		courseTitle: p.courseTitle,
		courseId: p.courseId
	}));

	// Fetch all categories and types for filters
	const categories = await db.select().from(schema.categories).all();
	const types = await db.select().from(schema.types).all();

	return {
		problems,
		categories: categories.map((c) => c.name),
		types: types.map((t) => t.name),
		courses: userCourses,
		selectedCourseId,
		hasMultipleCourses: userCourses.length > 1
	};
};
