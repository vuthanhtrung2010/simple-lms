import type { Actions, PageServerLoad } from './$types.js';
import { courses, problems, users, enrollments, courseProblems } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = params.id;
	if (!id) throw fail(404, { error: 'Course not found' });
	// Get course
	const course = await locals.db.select().from(courses).where(eq(courses.id, id)).get();
	if (!course) throw fail(404, { error: 'Course not found' });
	// Get all problems and users
	const allProblems = await locals.db.select().from(problems).all();
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
		.where(eq(enrollments.courseId, id))
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
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.EDIT_COURSE))
			return fail(403, { error: 'You do not have permission to perform this action.' });
		const id = params.id;
		if (!id) return fail(404, { error: 'Course not found' });
		const data = await request.formData();
		const title = data.get('title') as string;
		const isPublished = data.get('isPublished') === 'on';
		const showDebt = data.get('showDebt') === 'on';
		const quote = data.get('quote') as string;
		const quoteAuthor = data.get('quoteAuthor') as string;
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
					quoteAuthor
				})
				.where(eq(courses.id, id));
			// Update problems: remove all, then add selected
			await locals.db.delete(courseProblems).where(eq(courseProblems.courseId, id));
			if (problemIds.length > 0) {
				await locals.db.insert(courseProblems).values(
					problemIds.map((pid, idx) => ({
						courseId: id,
						problemId: pid,
						orderIndex: idx
					}))
				);
			}
			// Update enrollments: remove all, then add selected
			await locals.db.delete(enrollments).where(eq(enrollments.courseId, id));
			const enrollmentRows = [
				...studentIds.map((uid) => ({ userId: uid, courseId: id, role: 'student' })),
				...teacherIds.map((uid) => ({ userId: uid, courseId: id, role: 'teacher' })),
				...supervisorIds.map((uid) => ({ userId: uid, courseId: id, role: 'supervisor' }))
			];
			if (enrollmentRows.length > 0) {
				await locals.db.insert(enrollments).values(enrollmentRows);
			}
			return {};
		} catch (error) {
			console.error('Failed to update course:', error);
			return fail(500, { error: 'Failed to update course' });
		}
	}
} satisfies Actions;
