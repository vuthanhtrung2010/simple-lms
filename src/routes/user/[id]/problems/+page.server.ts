import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
	users,
	submissions,
	problems,
	courseProblems,
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

	// Get user's enrollments
	const userEnrollments = await locals.db
		.select({
			courseId: enrollments.courseId,
			courseName: courses.title
		})
		.from(enrollments)
		.innerJoin(courses, eq(enrollments.courseId, courses.id))
		.where(and(eq(enrollments.userId, id), eq(enrollments.isDeleted, false)))
		.all();

	// Get all problems the user has attempted, grouped by course
	const problemsByCourse = new Map<
		string,
		{ solved: any[]; attempted: any[]; courseName: string }
	>();

	for (const enrollment of userEnrollments) {
		// Get all problems in this course
		const courseProblemsData = await locals.db
			.select({
				problemId: problems.id,
				title: problems.title,
				maxScore: sql<number>`(
					SELECT SUM(points) 
					FROM questions 
					WHERE problem_id = ${problems.id}
				)`
			})
			.from(courseProblems)
			.innerJoin(problems, eq(courseProblems.problemId, problems.id))
			.where(eq(courseProblems.courseId, enrollment.courseId))
			.orderBy(courseProblems.orderIndex)
			.all();

		// Get user's submissions for these problems
		const userSubmissionsForCourse = await locals.db
			.select({
				problemId: submissions.problemId,
				score: submissions.score,
				maxScore: submissions.maxScore,
				status: submissions.status
			})
			.from(submissions)
			.where(
				and(
					eq(submissions.userId, id),
					sql`${submissions.problemId} IN (
						SELECT problem_id 
						FROM course_problems 
						WHERE course_id = ${enrollment.courseId}
					)`
				)
			)
			.all();

		// Create a map of problemId to best submission
		const submissionMap = new Map<
			string,
			{ score: number; maxScore: number; status: string }
		>();
		for (const sub of userSubmissionsForCourse) {
			const existing = submissionMap.get(sub.problemId);
			if (
				!existing ||
				sub.score > existing.score ||
				(sub.score === existing.score && sub.status === 'graded')
			) {
				submissionMap.set(sub.problemId, {
					score: sub.score,
					maxScore: sub.maxScore,
					status: sub.status
				});
			}
		}

		// Categorize problems
		const solved: any[] = [];
		const attempted: any[] = [];

		for (const prob of courseProblemsData) {
			const submission = submissionMap.get(String(prob.problemId));
			const probData = {
				id: prob.problemId,
				title: prob.title,
				maxScore: prob.maxScore || 0,
				userScore: submission?.score || 0,
				isSolved: submission ? submission.score === submission.maxScore : false
			};

			if (submission) {
				if (probData.isSolved) {
					solved.push(probData);
				} else {
					attempted.push(probData);
				}
			}
		}

		problemsByCourse.set(enrollment.courseId, {
			solved,
			attempted,
			courseName: enrollment.courseName
		});
	}

	// Calculate total stats
	let totalSolved = 0;
	let totalAttempted = 0;
	let totalPoints = 0;

	for (const [_, data] of problemsByCourse) {
		totalSolved += data.solved.length;
		totalAttempted += data.attempted.length;
		totalPoints += data.solved.reduce((sum, p) => sum + p.maxScore, 0);
	}

	return {
		user: {
			id: user.id,
			username: user.username,
			fullname: user.fullname,
            email: user.email,
		},
		problemsByCourse: Object.fromEntries(problemsByCourse),
		stats: {
			totalSolved,
			totalAttempted,
			totalPoints
		},
		currentUserId: locals.user?.id
	};
};
