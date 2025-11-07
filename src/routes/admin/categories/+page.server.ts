import type { PageServerLoad, Actions } from './$types.js';
import { categories } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: PageServerLoad = async ({ locals }) => {
	const allCategories = await locals.db.select().from(categories).all();
	return {
		categories: allCategories
	};
};

export const actions = {
	create: async ({ locals, request }) => {
		if (!locals.user?.perms)
			return fail(403, { error: 'You do not have permission to perform this action.' });

		const hasPerm =
			hasPermission(locals.user.perms, UserPermissions.CREATE_PROBLEM) ||
			hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM) ||
			hasPermission(locals.user.perms, UserPermissions.DELETE_PROBLEM);

		if (!hasPerm) return fail(403, { error: 'You do not have permission to perform this action.' });

		const data = await request.formData();
		const name = data.get('name') as string;

		if (!name || name.trim().length === 0) {
			return fail(400, { error: 'Category name is required' });
		}

		try {
			await locals.db.insert(categories).values({ name: name.trim() });
			return { success: true };
		} catch (error) {
			console.error('Failed to create category:', error);
			return fail(500, { error: 'Failed to create category. It may already exist.' });
		}
	},

	update: async ({ locals, request }) => {
		if (!locals.user?.perms)
			return fail(403, { error: 'You do not have permission to perform this action.' });

		const hasPerm =
			hasPermission(locals.user.perms, UserPermissions.CREATE_PROBLEM) ||
			hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM) ||
			hasPermission(locals.user.perms, UserPermissions.DELETE_PROBLEM);

		if (!hasPerm) return fail(403, { error: 'You do not have permission to perform this action.' });

		const data = await request.formData();
		const id = data.get('id');
		const name = data.get('name') as string;

		if (!id || !name || name.trim().length === 0) {
			return fail(400, { error: 'ID and name are required' });
		}

		try {
			await locals.db
				.update(categories)
				.set({ name: name.trim() })
				.where(eq(categories.id, Number(id)));
			return { success: true };
		} catch (error) {
			console.error('Failed to update category:', error);
			return fail(500, { error: 'Failed to update category' });
		}
	},

	delete: async ({ locals, request }) => {
		if (!locals.user?.perms)
			return fail(403, { error: 'You do not have permission to perform this action.' });

		const hasPerm =
			hasPermission(locals.user.perms, UserPermissions.CREATE_PROBLEM) ||
			hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM) ||
			hasPermission(locals.user.perms, UserPermissions.DELETE_PROBLEM);

		if (!hasPerm) return fail(403, { error: 'You do not have permission to perform this action.' });

		const data = await request.formData();
		const id = data.get('id');

		if (!id) {
			return fail(400, { error: 'ID is required' });
		}

		try {
			await locals.db.delete(categories).where(eq(categories.id, Number(id)));
			return { success: true };
		} catch (error) {
			console.error('Failed to delete category:', error);
			return fail(500, { error: 'Failed to delete category. It may be in use.' });
		}
	}
} satisfies Actions;
