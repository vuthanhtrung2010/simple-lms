import type { Actions, PageServerLoad } from './$types.js';
import { courses, enrollments } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.id || !locals.user?.perms) {
		return fail(401, { error: 'Unauthorized' });
	}

	// If user has EDIT_COURSE permission, show all courses
	if (hasPermission(locals.user.perms, UserPermissions.EDIT_COURSE)) {
		const allCourses = await locals.db
			.select()
			.from(courses)
			.where(eq(courses.isDeleted, false))
			.all();
		return {
			courses: allCourses
		};
	}

	// If user has EDIT_PERMITTED_COURSE, show only courses where they are a teacher
	if (hasPermission(locals.user.perms, UserPermissions.EDIT_PERMITTED_COURSE)) {
		const teacherEnrollments = await locals.db
			.select({ courseId: enrollments.courseId })
			.from(enrollments)
			.where(
				and(
					eq(enrollments.userId, locals.user.id),
					eq(enrollments.role, 'teacher'),
					eq(enrollments.isDeleted, false)
				)
			)
			.all();

		const courseIds = teacherEnrollments.map((e) => e.courseId);

		if (courseIds.length === 0) {
			return { courses: [] };
		}

		const teacherCourses = await locals.db
			.select()
			.from(courses)
			.where(eq(courses.isDeleted, false))
			.all()
			.then((allCourses) => allCourses.filter((c) => courseIds.includes(c.id)));

		return {
			courses: teacherCourses
		};
	}

	// No permission to view courses
	return { courses: [] };
};

export const actions = {
	delete: async ({ locals, request }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.DELETE_COURSE))
			return fail(403, { error: 'You do not have permission to perform this action.' });

		const data = await request.formData();
		const id = data.get('id');

		if (!id) {
			return fail(400, { error: 'ID is required' });
		}

		try {
			// Soft delete
			await locals.db
				.update(courses)
				.set({ isDeleted: true })
				.where(eq(courses.id, String(id)));
			return { success: true };
		} catch (error) {
			console.error('Failed to delete course:', error);
			return fail(500, { error: 'Failed to delete course. It may be in use.' });
		}
	}
} satisfies Actions;
