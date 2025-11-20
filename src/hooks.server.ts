import { error, json, text, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema.js';
import { getAuthSession, clearAuthSession, type AuthSession, type User } from '$lib/server/auth.js';
import type { D1Database } from './types.js';
import { verify } from '$lib/server/jwt.js';
import { eq } from 'drizzle-orm';

async function fetchUser(session: AuthSession, db: D1Database): Promise<User | undefined> {
	try {
		const verified = verify(session.sessionToken);
		if (!verified || !verified.id) throw new Error('Invalid session token');

		// Fetch session from DB to ensure it exists and get userId
		const dbSession = await db
			.select()
			.from(schema.sessions)
			.where(eq(schema.sessions.id, verified.id))
			.get();
		if (!dbSession) throw new Error('Session does not exist');

		if (dbSession.expiresAt < Date.now()) {
			// Session expired, clear it
			console.log('Session expired for session ID:', dbSession.id);
			return undefined;
		}

		// Now fetch user using the userId from the valid session
		const user = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.id, dbSession.userId))
			.get();

		if (!user) return undefined;

		return {
			id: user.id,
			email: user.email,
			fullname: user.fullname,
			username: user.username,
			perms: BigInt(user.permissions)
		};
	} catch (err) {
		console.error('Failed to fetch user data:', err);
		// throw new Error('Fetch user data failed:', { cause: err });
	}
}

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

const handleDB: Handle = async ({ event, resolve }) => {
	if (event.platform?.env.DB) {
		event.locals.db = drizzle(event.platform.env.DB, { schema });
	} else {
		throw new Error('D1 Database binding "DB" is not found in the environment.');
	}

	const response = await resolve(event);
	return response;
};

const handleR2: Handle = async ({ event, resolve }) => {
	if (event.platform?.env.R2) {
		event.locals.r2 = event.platform.env.R2;
	} else {
		throw new Error('R2 binding "R2" is not found in the environment.');
	}

	const response = await resolve(event);
	return response;
};

const handleKV: Handle = async ({ event, resolve }) => {
	if (event.platform?.env.KV) {
		event.locals.kv = event.platform.env.KV;
	} else {
		throw new Error('KV binding "KV" is not found in the environment.');
	}

	const response = await resolve(event);
	return response;
};

const handleAuth: Handle = async ({ event, resolve }) => {
	const session = await getAuthSession(event.cookies);
	if (session) {
		const user = await fetchUser(session, event.locals.db);
		if (!user) {
			// invalid → clear
			await clearAuthSession(event.cookies);
			event.locals.session = null;
			event.locals.user = null;
			event.locals.sessionToken = null;
		} else {
			// valid → set
			event.locals.session = session;
			event.locals.user = user;
			event.locals.sessionToken = session.sessionToken;
		}
	} else {
		event.locals.session = null;
		event.locals.user = null;
		event.locals.sessionToken = null;
	}

	return resolve(event);
};

/**
 * CSRF protection with ability to exclude specific routes.
 * Supports wildcard (*) patterns for path matching.
 */
const csrf =
	(allowedPaths: string[]): Handle =>
	async ({ event, resolve }) => {
		const { request, url } = event;

		// Check if path matches any allowed pattern
		const isAllowed = allowedPaths.some((pattern) => {
			if (pattern.includes('*')) {
				// Convert wildcard pattern to regex
				const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
				return new RegExp(`^${regexPattern}$`).test(url.pathname);
			}
			return pattern === url.pathname;
		});

		const forbidden =
			isFormContentType(request) &&
			(request.method === 'POST' ||
				request.method === 'PUT' ||
				request.method === 'PATCH' ||
				request.method === 'DELETE') &&
			request.headers.get('origin') !== url.origin &&
			!isAllowed;

		if (forbidden) {
			const message = `Cross-site ${request.method} form submissions are forbidden`;
			if (request.headers.get('accept') === 'application/json') {
				return json({ message }, { status: 403 });
			}
			return text(message, { status: 403 });
		}

		return resolve(event);
	};

function isContentType(request: Request, ...types: string[]) {
	const type = request.headers.get('content-type')?.split(';', 1)[0].trim() ?? '';
	return types.includes(type.toLowerCase());
}

function isFormContentType(request: Request) {
	return isContentType(
		request,
		'application/x-www-form-urlencoded',
		'multipart/form-data',
		'text/plain'
	);
}

export const handle: Handle = sequence(
	csrf(['/api/*']),
	handleParaglide,
	handleDB,
	handleR2,
	handleKV,
	handleAuth
);
