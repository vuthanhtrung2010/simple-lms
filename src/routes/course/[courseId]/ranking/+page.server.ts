import type { PageServerLoad } from './$types.js';
import { error, redirect } from '@sveltejs/kit';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import {
	courses,
	enrollments,
	users,
	courseProblems,
	submissions,
	typeRatings,
	announcements as announcementsTable,
	problems
} from '$lib/server/db/schema.js';
import { processMarkdownToHtml } from '$lib/markdown-processor.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { courseId } = params;

	// Require authentication
	if (!locals.user) throw redirect(302, '/login');
	const db = locals.db;

	// Fetch course metadata
	const courseRow = await db
		.select({
			id: courses.id,
			title: courses.title,
			showDebt: courses.showDebt,
			quote: courses.quote,
			quoteAuthor: courses.quoteAuthor
		})
		.from(courses)
		.where(and(eq(courses.id, courseId), eq(courses.isDeleted, false)))
		.get();

	if (!courseRow) throw error(404, 'Course not found');

	// Optional: ensure the current user can view this course (is enrolled)
	const viewerEnrollment = await db
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
	if (!viewerEnrollment) throw error(403, 'Forbidden');

	// Get all student enrollments for the course
	const studentRows = await db
		.select({
			userId: enrollments.userId,
			username: users.username,
			fullname: users.fullname
		})
		.from(enrollments)
		.innerJoin(users, eq(users.id, enrollments.userId))
		.where(
			and(
				eq(enrollments.courseId, courseId),
				eq(enrollments.role, 'student'),
				eq(enrollments.isDeleted, false)
			)
		)
		.all();

	const userIds = studentRows.map((s) => s.userId);

	// Early return if no students
	if (userIds.length === 0) {
		return {
			course: courseRow,
			users: [],
			totalProblems: 0
		};
	}

	// Count total problems in the course
	const totalProblemsRow = await db
		.select({ total: count() })
		.from(courseProblems)
		.where(eq(courseProblems.courseId, courseId))
		.get();
	const totalProblems = totalProblemsRow?.total ?? 0;

	// Quizzes completed per user: distinct problems they've submitted in this course
	const validStatuses = ['submitted', 'graded', 'returned'] as const;
	const quizzesRows = await db
		.select({
			userId: submissions.userId,
			countDistinct: sql<number>`COUNT(DISTINCT ${submissions.problemId})`
		})
		.from(submissions)
		.innerJoin(courseProblems, eq(courseProblems.problemId, submissions.problemId))
		.where(
			and(
				eq(courseProblems.courseId, courseId),
				inArray(submissions.userId, userIds),
				inArray(submissions.status, validStatuses as unknown as string[])
			)
		)
		.groupBy(submissions.userId)
		.all();

	const quizzesMap = new Map<string, number>();
	for (const r of quizzesRows) quizzesMap.set(r.userId, r.countDistinct ?? 0);

	// Aggregate rating per user from type_ratings (weighted by submission_count)
	const ratingAggRows = await db
		.select({
			userId: typeRatings.userId,
			sumWeighted: sql<number>`SUM(${typeRatings.rating} * ${typeRatings.submissionCount})`,
			sumCount: sql<number>`SUM(${typeRatings.submissionCount})`
		})
		.from(typeRatings)
		.where(and(eq(typeRatings.courseId, courseId), inArray(typeRatings.userId, userIds)))
		.groupBy(typeRatings.userId)
		.all();

	const ratingMap = new Map<string, number>();
	for (const r of ratingAggRows) {
		const denom = r.sumCount ?? 0;
		ratingMap.set(r.userId, denom > 0 ? (r.sumWeighted ?? 0) / denom : 1500);
	}

	// Build users payload
	const usersPayload = studentRows.map((s) => {
		const name = s.fullname ?? s.username ?? 'User';
		const shortName = name
			.split(' ')
			.filter(Boolean)
			.map((p) => p[0]?.toUpperCase() ?? '')
			.slice(0, 2)
			.join('');
		const quizzesCompleted = quizzesMap.get(s.userId) ?? 0;
		const debt = Math.max(0, totalProblems - quizzesCompleted);
		const rating = ratingMap.get(s.userId) ?? 1500;
		return {
			id: s.userId,
			name,
			shortName,
			rating,
			quizzesCompleted,
			debt
		};
	});

	// Announcements (latest first)
	const announcementsRaw = await db
		.select({
			id: announcementsTable.id,
			title: announcementsTable.title,
			content: announcementsTable.content,
			createdAt: announcementsTable.createdAt
		})
		.from(announcementsTable)
		.where(eq(announcementsTable.courseId, courseId))
		.orderBy(desc(announcementsTable.createdAt))
		.limit(10)
		.all();

	// Process markdown content for each announcement
	const announcements = await Promise.all(
		announcementsRaw.map(async (announcement) => ({
			...announcement,
			processedContent: announcement.content
				? await processMarkdownToHtml(announcement.content)
				: ''
		}))
	);

	// Recent submissions for this course
	const recent = await db
		.select({
			id: submissions.id,
			submittedAt: submissions.submittedAt,
			userId: users.id,
			userName: users.fullname,
			username: users.username,
			quizName: problems.title
		})
		.from(submissions)
		.innerJoin(courseProblems, eq(courseProblems.problemId, submissions.problemId))
		.innerJoin(users, eq(users.id, submissions.userId))
		.innerJoin(problems, eq(problems.id, courseProblems.problemId))
		.where(eq(courseProblems.courseId, courseId))
		.orderBy(desc(submissions.submittedAt))
		.limit(20)
		.all();

	return {
		course: courseRow,
		users: usersPayload,
		totalProblems,
		announcements,
		recentSubmissions: recent.map((r) => ({
			id: r.id,
			submittedAt: r.submittedAt,
			userId: r.userId,
			userName: r.userName ?? r.username,
			quizName: r.quizName
		}))
	};
};
