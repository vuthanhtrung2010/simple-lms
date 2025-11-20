import type { Actions, PageServerLoad } from './$types.js';
import { problems } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Try to get from KV cache
	const cacheKey = 'adminProblems';
	const cached = await locals.kv.get(cacheKey);

	let allProblems;
	if (cached) {
		allProblems = JSON.parse(cached);
	} else {
		// Fetch from database
		allProblems = await locals.db.select().from(problems).all();

		// Cache for 5 minutes (300 seconds)
		await locals.kv.put(cacheKey, JSON.stringify(allProblems), {
			expirationTtl: 300
		});
	}

	return {
		problems: allProblems,
		canEdit: locals.user?.perms
			? hasPermission(locals.user.perms, UserPermissions.EDIT_PROBLEM)
			: false
	};
};

export const actions = {
	delete: async ({ locals, request }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.DELETE_PROBLEM))
			return fail(403, { error: 'You do not have permission to perform this action.' });

		const data = await request.formData();
		const id = data.get('id');

		if (!id) {
			return fail(400, { error: 'ID is required' });
		}

		try {
			await locals.db.delete(problems).where(eq(problems.id, Number(id)));

			// Invalidate caches
			await locals.kv.delete('adminProblems');
			await locals.kv.delete(`${id}:points`);

			return { success: true };
		} catch (error) {
			console.error('Failed to delete problem:', error);
			return fail(500, { error: 'Failed to delete problem. It may be in use.' });
		}
	}
} satisfies Actions;
