import { redirect, type Cookies } from '@sveltejs/kit';
import type { D1Database } from '../../types.js';
import { verify } from './jwt.js';
import { sessions } from './db/schema.js';
import { eq } from 'drizzle-orm';

export interface User {
	id: string;
	email: string;
	username: string;
	fullname: string | null;
	perms?: bigint;
}

export interface AuthSession {
	sessionToken: string;
	sessionExpires: number;
	user: User;
}

const COOKIE_NAME = 'auth-session';
const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: (typeof process !== 'undefined' ? process.env.NODE_ENV : 'development') === 'production',
	sameSite: 'lax' as const,
	path: '/',
	maxAge: 60 * 60 * 24 * 7
};

// ✅ No encryption anymore - plain JSON cookies
async function writeSessionCookie(cookies: Cookies, session: AuthSession) {
	cookies.set(COOKIE_NAME, JSON.stringify(session), COOKIE_OPTIONS);
}

export async function setAuthSession(
	cookies: Cookies,
	sessionToken: string,
	user: User
): Promise<void> {
	let expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // default 7 days

	try {
		const [, payloadPart] = sessionToken.split('.');
		if (payloadPart) {
			const decoded = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
			if (decoded.exp) expires = decoded.exp * 1000;
		}
	} catch {}

	const session: AuthSession = {
		sessionToken,
		sessionExpires: expires,
		user
	};

	await writeSessionCookie(cookies, session);
}

export async function getAuthSession(cookies: Cookies): Promise<AuthSession | null> {
	const raw = cookies.get(COOKIE_NAME);
	if (!raw) return null;

	try {
		const session = JSON.parse(raw) as AuthSession;
		if (Date.now() > session.sessionExpires) {
			await clearAuthSession(cookies);
			console.log('Auth session expired');
			return null;
		}
		return session;
	} catch (error) {
		await clearAuthSession(cookies);
		console.log('Failed to parse auth session cookie:', error);
		return null;
	}
}

export async function clearAuthSession(cookies: Cookies): Promise<void> {
	cookies.delete(COOKIE_NAME, { path: '/' });
	console.log('Cleared auth session cookie');
}

export async function requireAuth(event: { cookies: Cookies }): Promise<AuthSession> {
	const session = await getAuthSession(event.cookies);
	if (!session) redirect(302, '/accounts/login');
	return session;
}

export async function getUser(cookies: Cookies): Promise<User | null> {
	const session = await getAuthSession(cookies);
	return session?.user ?? null;
}

export async function deleteBackendSession(
	sessionToken: string | null | undefined,
	db: D1Database
) {
	if (!sessionToken) return;
	try {
		const verified = verify(sessionToken);
		if (!verified) throw new Error('Invalid session token');

		await db.delete(sessions).where(eq(sessions.id, verified.id));
	} catch (err) {
		console.error('Failed to delete backend session:', err);
	}
}
