import type { Actions, PageServerLoad } from './$types.js';
import { courses, problems, users, enrollments, courseProblems } from '$lib/server/db/schema.js';
import { fail } from '@sveltejs/kit';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: PageServerLoad = async ({ locals }) => {
	// Try to get problems from KV cache
	const cacheKey = 'adminProblems';
	const cached = await locals.kv.get(cacheKey);
	
	let allProblems;
	if (cached) {
		allProblems = JSON.parse(cached);
	} else {
		allProblems = await locals.db.select().from(problems).all();
		await locals.kv.put(cacheKey, JSON.stringify(allProblems), {
			expirationTtl: 300
		});
	}
	
	// Get all users for multi-selects
	const allUsers = await locals.db.select().from(users).all();
	
	// Get DB defaults for quote/author
	const defaults = {
		quote: courses.quote.default ?? 'Thi đua là yêu nước, yêu nước phải thi đua',
		quoteAuthor: courses.quoteAuthor.default ?? 'Bác Hồ'
	};
	return {
		problems: allProblems,
		users: allUsers,
		defaults
	};
};

export const actions = {
	default: async ({ locals, request }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.CREATE_COURSE))
			return fail(403, { error: 'You do not have permission to perform this action.' });

		const data = await request.formData();
		const title = data.get('title') as string;
		const isPublished = data.get('isPublished') === 'on';
		const showDebt = data.get('showDebt') === 'on';
		const enrollmentMode = (data.get('enrollmentMode') as string) || 'hidden';
		const quote = data.get('quote') as string;
		const quoteAuthor = data.get('quoteAuthor') as string;
		const problemIds = data.getAll('problems') as string[];
		const studentIds = data.getAll('students') as string[];
		const teacherIds = data.getAll('teachers') as string[];
		const supervisorIds = data.getAll('supervisors') as string[];

		// Validate required fields
		if (!title || title.trim().length === 0) {
			return fail(400, { error: 'Title is required' });
		}

		// Ensure no user is in more than one role
		const allRoleIds = [...studentIds, ...teacherIds, ...supervisorIds];
		const uniqueRoleIds = new Set(allRoleIds);
		if (uniqueRoleIds.size < allRoleIds.length) {
			return fail(400, { error: 'A user cannot have more than one role in a course.' });
		}

		try {
			// Create the course
			const [newCourse] = await locals.db
				.insert(courses)
				.values({
					title: title.trim(),
					description: '',
					isPublished,
					showDebt,
					enrollmentMode,
					quote,
					quoteAuthor
				})
				.returning();

			// Prepare batch operations
			const batchOperations = [];

			// Add problems to course using batch inserts
			// SQLite has a limit of 999 params per statement, so batch smaller
			if (problemIds.length > 0) {
				const BATCH_SIZE = 10; // 10 rows × 3 params = 30 params (safe limit)
				const courseProblemRows = problemIds.map((pid, idx) => ({
					courseId: newCourse.id,
					problemId: pid,
					orderIndex: idx
				}));

				for (let i = 0; i < courseProblemRows.length; i += BATCH_SIZE) {
					const batch = courseProblemRows.slice(i, i + BATCH_SIZE);
					batchOperations.push(locals.db.insert(courseProblems).values(batch));
				}
			}

			// Add enrollments for each role using batch inserts
			const enrollmentRows = [
				...studentIds.map((uid) => ({ userId: uid, courseId: newCourse.id, role: 'student' })),
				...teacherIds.map((uid) => ({ userId: uid, courseId: newCourse.id, role: 'teacher' })),
				...supervisorIds.map((uid) => ({ userId: uid, courseId: newCourse.id, role: 'supervisor' }))
			];

			if (enrollmentRows.length > 0) {
				const BATCH_SIZE = 10; // 10 rows × 3 params = 30 params (safe limit)

				for (let i = 0; i < enrollmentRows.length; i += BATCH_SIZE) {
					const batch = enrollmentRows.slice(i, i + BATCH_SIZE);
					batchOperations.push(locals.db.insert(enrollments).values(batch));
				}
			}

			if (batchOperations.length > 0) {
				await locals.db.batch(batchOperations as any); // Typing is stupid, anyways let's use any?
			}

			return {};
		} catch (error) {
			console.error('Failed to create course:', error);
			return fail(500, { error: 'Failed to create course' });
		}
	}
} satisfies Actions;
