import type { Actions, PageServerLoad } from './$types.js';
import { courses } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: PageServerLoad = async ({ locals }) => {
	const allCourses = await locals.db
		.select()
		.from(courses)
		.where(eq(courses.isDeleted, false))
		.all();
	return {
		courses: allCourses
	};
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
