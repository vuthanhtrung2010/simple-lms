import type { LayoutServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user || !locals.sessionToken) {
		redirect(302, '/accounts/login?callbackUrl=/admin');
	}

	// Check if user has permission to view management page
	if (
		!locals.user.perms ||
		!hasPermission(locals.user.perms, UserPermissions.VIEW_MANAGEMENT_PAGE)
	) {
		redirect(302, '/');
	}

	return {
		user: locals.user
	};
};
