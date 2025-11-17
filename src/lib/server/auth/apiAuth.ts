import { error } from '@sveltejs/kit';
import { apiKeys } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { D1Database } from '$lib/../types.js';

export async function validateApiKey(
	authHeader: string | null,
	db: D1Database
): Promise<{ userId: string }> {
	if (!authHeader) {
		error(401, { message: 'Missing Authorization header' });
	}

	// Extract Bearer token
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	if (!match) {
		error(401, { message: 'Invalid Authorization header format. Expected: Bearer <token>' });
	}

	const token = match[1];

	// Validate token format
	if (!token.startsWith('lms_')) {
		error(401, { message: 'Invalid API key format' });
	}

	// Look up the API key
	const apiKey = await db
		.select({
			id: apiKeys.id,
			userId: apiKeys.userId,
			expiresAt: apiKeys.expiresAt
		})
		.from(apiKeys)
		.where(eq(apiKeys.key, token))
		.get();

	if (!apiKey) {
		error(401, { message: 'Invalid API key' });
	}

	// Check if expired (0 means no expiration)
	if (apiKey.expiresAt !== 0 && apiKey.expiresAt < Date.now()) {
		error(401, { message: 'API key has expired' });
	}

	return { userId: apiKey.userId };
}
