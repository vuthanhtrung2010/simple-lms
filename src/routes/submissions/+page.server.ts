import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { eq, and, desc, or } from 'drizzle-orm';
import {
	submissions,
	users,
	problems,
	courseProblems,
	courses,
	enrollments
} from '$lib/server/db/schema.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}

	const problemId = url.searchParams.get('problem');
	const userId = url.searchParams.get('user');

	// Build query
	let query = locals.db
		.select({
			id: submissions.id,
			userId: submissions.userId,
			problemId: submissions.problemId,
			attemptNumber: submissions.attemptNumber,
			score: submissions.score,
			maxScore: submissions.maxScore,
			submittedAt: submissions.submittedAt,
			status: submissions.status,
			userName: users.fullname,
			userUsername: users.username,
			problemTitle: problems.title,
			courseId: courseProblems.courseId
		})
		.from(submissions)
		.innerJoin(users, eq(submissions.userId, users.id))
		.innerJoin(problems, eq(submissions.problemId, problems.id))
		.innerJoin(courseProblems, eq(problems.id, courseProblems.problemId))
		.where(eq(submissions.status, 'submitted'))
		.orderBy(desc(submissions.submittedAt))
		.limit(1000);

	const allSubmissions = await query.all();

	return {
		submissions: allSubmissions,
		problemId,
		userId,
	};
};
