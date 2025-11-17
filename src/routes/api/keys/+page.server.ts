import type { PageServerLoad, Actions } from './$types.js';
import { error, fail } from '@sveltejs/kit';
import { apiKeys } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const load: PageServerLoad = async ({ locals }) => {
	// Require authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const db = locals.db;

	// Load all API keys for current user
	const keys = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			key: apiKeys.key,
			createdAt: apiKeys.createdAt,
			expiresAt: apiKeys.expiresAt
		})
		.from(apiKeys)
		.where(eq(apiKeys.userId, locals.user.id!))
		.orderBy(apiKeys.createdAt)
		.all();

	return {
		keys
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!locals.user) {
			error(401, 'Unauthorized');
		}

		const db = locals.db;
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const expiresInDays = parseInt(formData.get('expiresInDays') as string, 10);

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { error: 'Name is required' });
		}

		if (!expiresInDays || expiresInDays < 0 || expiresInDays > 365) {
			return fail(400, { error: 'Expiration must be between 0 (no expiration) and 365 days' });
		}

		// Generate secure API key
		const apiKey = `lms_${crypto.randomBytes(32).toString('hex')}`;
		// 0 means no expiration
		const expiresAt = expiresInDays === 0 ? 0 : Date.now() + expiresInDays * 24 * 60 * 60 * 1000;

		try {
			await db.insert(apiKeys).values({
				userId: locals.user.id!,
				name: name.trim(),
				key: apiKey,
				expiresAt
			});

			return {
				success: true,
				message: 'API key created successfully',
				newKey: apiKey // Return the key only once for copying
			};
		} catch (err) {
			console.error('Failed to create API key:', err);
			return fail(500, { error: 'Failed to create API key' });
		}
	},

	delete: async ({ locals, request }) => {
		if (!locals.user) {
			error(401, 'Unauthorized');
		}

		const db = locals.db;
		const formData = await request.formData();
		const keyId = formData.get('keyId') as string;

		if (!keyId) {
			return fail(400, { error: 'Key ID is required' });
		}

		try {
			// Verify ownership before deleting
			const key = await db
				.select({ userId: apiKeys.userId })
				.from(apiKeys)
				.where(eq(apiKeys.id, keyId))
				.get();

			if (!key) {
				return fail(404, { error: 'API key not found' });
			}

			if (key.userId !== locals.user.id) {
				return fail(403, { error: 'You can only delete your own API keys' });
			}

			await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

			return {
				success: true,
				message: 'API key deleted successfully'
			};
		} catch (err) {
			console.error('Failed to delete API key:', err);
			return fail(500, { error: 'Failed to delete API key' });
		}
	}
};
