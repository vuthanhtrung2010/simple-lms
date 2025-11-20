import type { Actions, PageServerLoad } from './$types.js';
import { courses, problems, users, enrollments, courseProblems } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = params.id;
	if (!id) throw fail(404, { error: 'Course not found' });
	if (!locals.user?.id || !locals.user?.perms) {
		throw fail(401, { error: 'Unauthorized' });
	}

	// Get course
	const course = await locals.db
		.select()
		.from(courses)
		.where(and(eq(courses.id, id), eq(courses.isDeleted, false)))
		.get();
	if (!course) throw fail(404, { error: 'Course not found' });

	// Check permission: if user has EDIT_PERMITTED_COURSE but not EDIT_COURSE, verify they're a teacher
	const hasFullEditPerm = hasPermission(locals.user.perms, UserPermissions.EDIT_COURSE);
	const hasPermittedEditPerm = hasPermission(
		locals.user.perms,
		UserPermissions.EDIT_PERMITTED_COURSE
	);

	if (!hasFullEditPerm && hasPermittedEditPerm) {
		// Check if user is a teacher of this course
		const teacherEnrollment = await locals.db
			.select()
			.from(enrollments)
			.where(
				and(
					eq(enrollments.courseId, id),
					eq(enrollments.userId, locals.user.id),
					eq(enrollments.role, 'teacher'),
					eq(enrollments.isDeleted, false)
				)
			)
			.get();

		if (!teacherEnrollment) {
			throw fail(403, { error: 'You do not have permission to edit this course.' });
		}
	} else if (!hasFullEditPerm && !hasPermittedEditPerm) {
		throw fail(403, { error: 'You do not have permission to edit courses.' });
	}
	
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
	
	// Get all users
	const allUsers = await locals.db.select().from(users).all();
	// Get selected problems for this course
	const courseProblemsRows = await locals.db
		.select()
		.from(courseProblems)
		.where(eq(courseProblems.courseId, id))
		.all();
	const problemsSelected = courseProblemsRows.map((cp) => cp.problemId);
	// Get enrollments for this course
	const enrollRows = await locals.db
		.select()
		.from(enrollments)
		.where(and(eq(enrollments.courseId, id), eq(enrollments.isDeleted, false)))
		.all();
	const studentsSelected = enrollRows.filter((e) => e.role === 'student').map((e) => e.userId);
	const teachersSelected = enrollRows.filter((e) => e.role === 'teacher').map((e) => e.userId);
	const supervisorsSelected = enrollRows
		.filter((e) => e.role === 'supervisor')
		.map((e) => e.userId);
	return {
		course,
		problems: allProblems,
		users: allUsers,
		problemsSelected,
		studentsSelected,
		teachersSelected,
		supervisorsSelected
	};
};

export const actions = {
	default: async ({ locals, params, request }) => {
		if (!locals.user?.id || !locals.user?.perms) {
			return fail(401, { error: 'Unauthorized' });
		}

		const id = params.id;
		if (!id) return fail(404, { error: 'Course not found' });

		// Check permission: if user has EDIT_PERMITTED_COURSE but not EDIT_COURSE, verify they're a teacher
		const hasFullEditPerm = hasPermission(locals.user.perms, UserPermissions.EDIT_COURSE);
		const hasPermittedEditPerm = hasPermission(
			locals.user.perms,
			UserPermissions.EDIT_PERMITTED_COURSE
		);

		if (!hasFullEditPerm && hasPermittedEditPerm) {
			// Check if user is a teacher of this course
			const teacherEnrollment = await locals.db
				.select()
				.from(enrollments)
				.where(
					and(
						eq(enrollments.courseId, id),
						eq(enrollments.userId, locals.user.id),
						eq(enrollments.role, 'teacher'),
						eq(enrollments.isDeleted, false)
					)
				)
				.get();

			if (!teacherEnrollment) {
				return fail(403, { error: 'You do not have permission to edit this course.' });
			}
		} else if (!hasFullEditPerm && !hasPermittedEditPerm) {
			return fail(403, { error: 'You do not have permission to edit courses.' });
		}
		const data = await request.formData();
		const title = data.get('title') as string;
		const isPublished = data.get('isPublished') === 'on';
		const showDebt = data.get('showDebt') === 'on';
		const quote = data.get('quote') as string;
		const quoteAuthor = data.get('quoteAuthor') as string;
		const enrollmentMode = (data.get('enrollmentMode') as string) || 'hidden';
		let problemIds = data.getAll('problems') as string[];
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
			// Update course
			await locals.db
				.update(courses)
				.set({
					title: title.trim(),
					isPublished,
					showDebt,
					quote,
					quoteAuthor,
					enrollmentMode
				})
				.where(eq(courses.id, id));

			// Update problems: hard-reset mapping (no soft-delete needed here)
			await locals.db.delete(courseProblems).where(eq(courseProblems.courseId, id));
			
			// Insert problems in batches to avoid SQLite param limit
			if (problemIds.length > 0) {
				const BATCH_SIZE = 10; // 10 rows × 3 params = 30 params (safe limit)
				const batchOperations = [];
				const courseProblemRows = problemIds.map((pid, idx) => ({
					courseId: id,
					problemId: pid,
					orderIndex: idx
				}));

				for (let i = 0; i < courseProblemRows.length; i += BATCH_SIZE) {
					const batch = courseProblemRows.slice(i, i + BATCH_SIZE);
					batchOperations.push(locals.db.insert(courseProblems).values(batch));
				}

				await locals.db.batch(batchOperations as any);
			}

			// --- Enrollment soft-delete / restore logic ---
			const selectedIds = new Set([...studentIds, ...teacherIds, ...supervisorIds]);

			// 1) Fetch all existing enrollments for this course (active + deleted)
			const existingEnrollments = await locals.db
				.select()
				.from(enrollments)
				.where(eq(enrollments.courseId, id))
				.all();

			// 2) Soft-delete users no longer selected
			for (const e of existingEnrollments) {
				if (!selectedIds.has(e.userId) && !e.isDeleted) {
					await locals.db
						.update(enrollments)
						.set({ isDeleted: true })
						.where(eq(enrollments.id, e.id));
				}
			}

			// 3) Process enrollments and batch new inserts
			const updatesToExecute: any[] = [];
			const newEnrollments: any[] = [];

			// Helper to process enrollment (update existing or prepare for batch insert)
			function processEnrollment(userId: string, role: 'student' | 'teacher' | 'supervisor') {
				const existing = existingEnrollments.filter((e) => e.userId === userId);
				const active = existing.find((e) => !e.isDeleted);
				const deleted = existing.find((e) => e.isDeleted);

				if (active) {
					// Just update role if needed
					if (active.role !== role) {
						updatesToExecute.push(
							locals.db.update(enrollments).set({ role }).where(eq(enrollments.id, active.id))
						);
					}
					return;
				}

				if (deleted) {
					// Reactivate soft-deleted enrollment with new role
					updatesToExecute.push(
						locals.db
							.update(enrollments)
							.set({ isDeleted: false, role })
							.where(eq(enrollments.id, deleted.id))
					);
					return;
				}

				// No existing record: prepare for batch insert
				newEnrollments.push({ userId, courseId: id, role, isDeleted: false });
			}

			// Process all roles
			for (const uid of studentIds) {
				processEnrollment(uid, 'student');
			}
			for (const uid of teacherIds) {
				processEnrollment(uid, 'teacher');
			}
			for (const uid of supervisorIds) {
				processEnrollment(uid, 'supervisor');
			}

			// Execute all updates in batch
			if (updatesToExecute.length > 0) {
				await locals.db.batch(updatesToExecute as any);
			}

			// Batch insert new enrollments
			if (newEnrollments.length > 0) {
				const BATCH_SIZE = 10; // 10 rows × 4 params = 40 params (safe limit)
				const insertOperations = [];

				for (let i = 0; i < newEnrollments.length; i += BATCH_SIZE) {
					const batch = newEnrollments.slice(i, i + BATCH_SIZE);
					insertOperations.push(locals.db.insert(enrollments).values(batch));
				}

				await locals.db.batch(insertOperations as any);
			}

			return {};
		} catch (error) {
			console.error('Failed to update course:', error);
			return fail(500, { error: 'Failed to update course' });
		}
	}
} satisfies Actions;
