import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
	users,
	typeRatings,
	types,
	submissions,
	courseProblems,
	problems,
	courses,
	enrollments
} from '$lib/server/db/schema.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;

	// Get user data
	const user = await locals.db
		.select({
			id: users.id,
			username: users.username,
			email: users.email,
			fullname: users.fullname,
			bio: users.bio,
			createdAt: users.createdAt
		})
		.from(users)
		.where(eq(users.id, id))
		.get();

	if (!user) {
		error(404, 'User not found');
	}

	// Get user's average rating across all types
	const userRatings = await locals.db
		.select({
			type: types.name,
			rating: typeRatings.rating
		})
		.from(typeRatings)
		.innerJoin(types, eq(typeRatings.typeId, types.id))
		.where(eq(typeRatings.userId, id))
		.all();

	const avgRating =
		userRatings.length > 0
			? userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length
			: 1000;

	// Get user's enrollments with course info
	const userEnrollments = await locals.db
		.select({
			courseId: enrollments.courseId,
			courseName: courses.title,
			role: enrollments.role,
			enrolledAt: enrollments.enrolledAt
		})
		.from(enrollments)
		.innerJoin(courses, eq(enrollments.courseId, courses.id))
		.where(and(eq(enrollments.userId, id), eq(enrollments.isDeleted, false)))
		.all();

	// Get solved problems count
	const solvedProblemsCount = await locals.db
		.select({ count: sql<number>`count(distinct ${submissions.problemId})` })
		.from(submissions)
		.where(
			and(
				eq(submissions.userId, id),
				sql`${submissions.score} > 0`,
				eq(submissions.status, 'graded')
			)
		)
		.get();

	// Get total submissions count
	const totalSubmissionsCount = await locals.db
		.select({ count: sql<number>`count(*)` })
		.from(submissions)
		.where(eq(submissions.userId, id))
		.get();

	// Get activity heatmap data (submissions in last year)
	const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
	const activityData = await locals.db
		.select({
			submittedAt: submissions.submittedAt
		})
		.from(submissions)
		.where(
			and(
				eq(submissions.userId, id),
				eq(submissions.status, 'graded'),
				sql`${submissions.submittedAt} IS NOT NULL`,
				sql`${submissions.submittedAt} > ${oneYearAgo}`
			)
		)
		.all();

	// Get rating history by course
	const ratingHistoryByCourse = new Map<string, any[]>();

	for (const enrollment of userEnrollments) {
		// Get submissions for this course with rating changes
		const courseSubmissions = await locals.db
			.select({
				problemId: submissions.problemId,
				submittedAt: submissions.submittedAt,
				score: submissions.score,
				maxScore: submissions.maxScore,
				problemTitle: problems.title
			})
			.from(submissions)
			.innerJoin(courseProblems, eq(submissions.problemId, courseProblems.problemId))
			.innerJoin(problems, eq(submissions.problemId, problems.id))
			.where(
				and(
					eq(submissions.userId, id),
					eq(courseProblems.courseId, enrollment.courseId),
					eq(submissions.status, 'graded'),
					eq(submissions.attemptNumber, 1) // Only first attempts affect rating
				)
			)
			.orderBy(submissions.submittedAt)
			.all();

		ratingHistoryByCourse.set(enrollment.courseId, courseSubmissions);
	}

	return {
		user: {
			id: user.id,
			username: user.username,
			fullname: user.fullname,
			bio: user.bio,
			createdAt: user.createdAt,
            email: user.email
		},
		avgRating,
		userRatings,
		enrollments: userEnrollments,
		stats: {
			solvedProblems: solvedProblemsCount?.count || 0,
			totalSubmissions: totalSubmissionsCount?.count || 0
		},
		activityData: activityData
			.filter((a) => a.submittedAt !== null)
			.map((a) => ({ timestamp: a.submittedAt! })),
		ratingHistoryByCourse: Object.fromEntries(ratingHistoryByCourse),
		currentUserId: locals.user?.id
	};
};
