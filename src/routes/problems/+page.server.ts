import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { eq, and, inArray, sql, like, desc, asc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema.js';

const PROBLEMS_PER_PAGE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/accounts/login');
	}

	const db = locals.db;
	const userId = locals.user.id;

	// Parse URL parameters
	const page = parseInt(url.searchParams.get('page') || '1');
	const search = url.searchParams.get('search') || '';
	const category = url.searchParams.get('category') || '';
	const typesParam = url.searchParams.get('types') || '';
	const types = typesParam ? typesParam.split(',') : [];
	const hideSolved = url.searchParams.get('hideSolved') === 'true';
	const sortField = url.searchParams.get('sortField') || '';
	const sortOrder = url.searchParams.get('sortOrder') || '';

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
		throw redirect(302, '/');
	}

	const userCourses = enrollments.map((e) => ({
		id: e.courseId,
		title: e.courseTitle
	}));
	userCourses.sort((a, b) => a.title.localeCompare(b.title));

	// Determine selected course
	const selectedCourseParam = url.searchParams.get('course');
	let selectedCourseId: string | null = null;

	if (selectedCourseParam === 'all') {
		selectedCourseId = 'all';
	} else if (selectedCourseParam && userCourses.some((c) => c.id === selectedCourseParam)) {
		selectedCourseId = selectedCourseParam;
	} else if (userCourses.length === 1) {
		selectedCourseId = userCourses[0].id;
	} else {
		selectedCourseId = userCourses[0].id;
	}

	const courseIds = userCourses.map((c) => c.id);

	// Build WHERE conditions
	const whereConditions = [];

	// Course filter
	if (selectedCourseId === 'all') {
		whereConditions.push(inArray(schema.courseProblems.courseId, courseIds));
	} else {
		whereConditions.push(eq(schema.courseProblems.courseId, selectedCourseId));
	}

	// Search filter
	if (search) {
		whereConditions.push(like(schema.problems.title, `%${search}%`));
	}

	// Category filter
	if (category) {
		whereConditions.push(eq(schema.categories.name, category));
	}

	// Count total problems - cache only for base queries (no search/types)
	let totalProblems = 0;

	if (search || types.length > 0) {
		// Always do COUNT query for search or type filters
		const countQuery = db
			.select({ count: sql<number>`count(DISTINCT ${schema.problems.id})` })
			.from(schema.problems)
			.innerJoin(schema.courseProblems, eq(schema.problems.id, schema.courseProblems.problemId))
			.innerJoin(schema.categories, eq(schema.problems.categoryId, schema.categories.id))
			.where(and(...whereConditions));

		const [{ count }] = await countQuery.all();
		totalProblems = count;
	} else {
		// Cache count for base queries (course + optional category)
		const cacheKey = `problemsCount:${selectedCourseId}:${category}`;
		const cachedCount = await locals.kv.get(cacheKey);

		if (cachedCount !== null) {
			totalProblems = parseInt(cachedCount);
		} else {
			const countQuery = db
				.select({ count: sql<number>`count(DISTINCT ${schema.problems.id})` })
				.from(schema.problems)
				.innerJoin(schema.courseProblems, eq(schema.problems.id, schema.courseProblems.problemId))
				.innerJoin(schema.categories, eq(schema.problems.categoryId, schema.categories.id))
				.where(and(...whereConditions));

			const [{ count }] = await countQuery.all();
			totalProblems = count;
			// Cache for 5 minutes
			await locals.kv.put(cacheKey, String(totalProblems), { expirationTtl: 300 });
		}
	}

	const totalPages = Math.ceil(totalProblems / PROBLEMS_PER_PAGE);

	// Fetch problems for current page
	let problemsQuery = db
		.select({
			id: schema.problems.id,
			title: schema.problems.title,
			rating: schema.problems.rating,
			points: schema.problems.points,
			categoryId: schema.problems.categoryId,
			categoryName: schema.categories.name,
			courseId: schema.courseProblems.courseId,
			courseTitle: schema.courses.title
		})
		.from(schema.problems)
		.innerJoin(schema.courseProblems, eq(schema.problems.id, schema.courseProblems.problemId))
		.innerJoin(schema.courses, eq(schema.courseProblems.courseId, schema.courses.id))
		.innerJoin(schema.categories, eq(schema.problems.categoryId, schema.categories.id))
		.where(and(...whereConditions))
		.limit(PROBLEMS_PER_PAGE)
		.offset((page - 1) * PROBLEMS_PER_PAGE);

	// Apply sorting
	if (sortField && sortOrder) {
		if (sortField === 'name') {
			problemsQuery = problemsQuery.orderBy(
				sortOrder === 'asc' ? asc(schema.problems.title) : desc(schema.problems.title)
			) as any;
		} else if (sortField === 'category') {
			problemsQuery = problemsQuery.orderBy(
				sortOrder === 'asc' ? asc(schema.categories.name) : desc(schema.categories.name)
			) as any;
		} else if (sortField === 'rating') {
			problemsQuery = problemsQuery.orderBy(
				sortOrder === 'asc' ? asc(schema.problems.rating) : desc(schema.problems.rating)
			) as any;
		}
	}

	const problemsData = await problemsQuery.all();
	const problemIds = problemsData.map((p) => String(p.id));

	// Fetch problem types
	let problemTypesData: any[] = [];
	if (problemIds.length > 0) {
		problemTypesData = await db
			.select({
				problemId: schema.problemTypes.problemId,
				typeName: schema.types.name
			})
			.from(schema.problemTypes)
			.innerJoin(schema.types, eq(schema.problemTypes.typeId, schema.types.id))
			.where(inArray(schema.problemTypes.problemId, problemIds))
			.all();
	}

	// Fetch submissions
	let submissionsData: any[] = [];
	if (problemIds.length > 0) {
		submissionsData = await db
			.select({
				problemId: schema.submissions.problemId,
				score: schema.submissions.score,
				maxScore: schema.submissions.maxScore
			})
			.from(schema.submissions)
			.where(
				and(
					eq(schema.submissions.userId, userId),
					inArray(schema.submissions.problemId, problemIds)
				)
			)
			.all();
	}

	// Build maps
	const problemTypeMap = new Map<string, string[]>();
	for (const pt of problemTypesData) {
		if (!problemTypeMap.has(pt.problemId)) problemTypeMap.set(pt.problemId, []);
		problemTypeMap.get(pt.problemId)!.push(pt.typeName);
	}

	const submissionStatusMap = new Map<string, { solved: boolean; attempted: boolean }>();
	for (const sub of submissionsData) {
		const solved = sub.score === sub.maxScore;
		const existing = submissionStatusMap.get(sub.problemId);
		if (!existing) {
			submissionStatusMap.set(sub.problemId, { solved, attempted: true });
		} else if (solved) {
			existing.solved = true;
		}
	}

	// Build problems array
	let problems = problemsData.map((p) => ({
		id: String(p.id),
		name: p.title,
		category: p.categoryName,
		points: p.points || 0,
		rating: p.rating,
		type: problemTypeMap.get(String(p.id)) || [],
		status: submissionStatusMap.get(String(p.id)),
		courseTitle: p.courseTitle,
		courseId: p.courseId
	}));

	// Apply type filter (client-side for simplicity)
	if (types.length > 0) {
		problems = problems.filter((p) => p.type.some((t) => types.includes(t)));
	}

	// Apply hideSolved filter
	if (hideSolved) {
		problems = problems.filter((p) => !p.status?.solved);
	}

	// Fetch all categories and types for filters
	const categories = await db.select().from(schema.categories).all();
	const allTypes = await db.select().from(schema.types).all();

	return {
		problems,
		categories: categories.map((c) => c.name),
		types: allTypes.map((t) => t.name),
		courses: userCourses,
		selectedCourseId,
		hasMultipleCourses: userCourses.length > 1,
		pagination: {
			currentPage: page,
			totalPages,
			totalProblems,
			perPage: PROBLEMS_PER_PAGE
		},
		filters: {
			search,
			category,
			types,
			hideSolved,
			sortField,
			sortOrder
		}
	};
};
