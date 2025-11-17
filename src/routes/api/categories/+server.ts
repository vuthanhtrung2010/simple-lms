import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { validateApiKey } from '$lib/server/auth/apiAuth.js';
import { categories } from '$lib/server/db/schema.js';

export const GET: RequestHandler = async ({ request, locals }) => {
	try {
		// Validate API key
		await validateApiKey(request.headers.get('Authorization'), locals.db);

		// Fetch all categories
		const allCategories = await locals.db
			.select({
				id: categories.id,
				name: categories.name
			})
			.from(categories)
			.all();

		return json({
			success: true,
			categories: allCategories
		});
	} catch (err: any) {
		return json(
			{
				success: false,
				error: err.message || 'Failed to fetch categories'
			},
			{ status: err.status || 500 }
		);
	}
};
