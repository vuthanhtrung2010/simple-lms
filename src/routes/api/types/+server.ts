import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { validateApiKey } from '$lib/server/auth/apiAuth.js';
import { types } from '$lib/server/db/schema.js';

export const GET: RequestHandler = async ({ request, locals }) => {
	try {
		// Validate API key
		await validateApiKey(request.headers.get('Authorization'), locals.db);

		// Fetch all types
		const allTypes = await locals.db
			.select({
				id: types.id,
				name: types.name
			})
			.from(types)
			.all();

		return json({
			success: true,
			types: allTypes
		});
	} catch (err: any) {
		return json(
			{
				success: false,
				error: err.message || 'Failed to fetch types'
			},
			{ status: err.status || 500 }
		);
	}
};
