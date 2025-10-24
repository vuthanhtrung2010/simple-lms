import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('app:session');

	return {
		session: locals.session,
		user: locals.user
	};
};
