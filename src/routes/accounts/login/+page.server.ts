import type { PageServerLoad, Actions } from './$types.js';
import { users, sessions } from '$lib/server/db/schema.js';
import { redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { validateTurnstile } from '$lib/server/turnstile.js';
import { eq } from 'drizzle-orm';
import { setAuthSession, type User } from '$lib/server/auth.js';
import { verifyPassword } from '$lib/server/password.js';
import { sign } from '$lib/server/jwt.js';

const loginSchema = z.object({
	email: z.email('Invalid email address'),
	password: z.string().min(1, 'Password is required'),
	'cf-turnstile-response': z.string().min(1, 'Captcha verification required')
});

export const load: PageServerLoad = async ({ locals, url }) => {
	// If user is already logged in, redirect to home or callback URL
	if (locals.user) {
		const callbackUrl = url.searchParams.get('callbackUrl') || '/';
		redirect(307, callbackUrl);
	}

	return {
		user: locals.user || null,
		session: locals.session || null
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress, locals }) => {
		try {
			const formData = await request.formData();
			const data = Object.fromEntries(formData);

			// Validate form data
			const result = loginSchema.safeParse(data);
			if (!result.success) {
				return fail(400, {
					error: result.error?.message || 'Invalid form data',
					email: data.email as string
				});
			}

			const { email, password, 'cf-turnstile-response': captchaToken } = result.data;

			// Verify captcha first
			const clientIp = getClientAddress();
			const captchaResult = await validateTurnstile(captchaToken, clientIp);
			if (!captchaResult.success) {
				return fail(400, {
					error: 'Captcha verification failed',
					email
				});
			}

			// Login auth
			const existingUser = await locals.db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1)
				.get();
			if (!existingUser) {
				return fail(400, {
					error: 'Invalid email or password',
					email
				});
			}

			const isPasswordValid = verifyPassword(password, existingUser.passwordHash);
			if (!isPasswordValid) {
				return fail(400, {
					error: 'Invalid email or password',
					email
				});
			}

			// Create session & set cookies & update last login
			await locals.db.update(users)
				.set({ lastLoginAt: Date.now() })
				.where(eq(users.id, existingUser.id));

			const newSession = await locals.db
				.insert(sessions)
				.values({
					userId: existingUser.id
					// expiresAt and createdAt are automatically set by your schema $defaultFn
				})
				.returning({ id: sessions.id })
				.get();

			if (!newSession) {
				return fail(500, {
					error: 'Failed to create session',
					email
				});
			}

			const payload = {
				id: newSession.id,
				userId: existingUser.id,
				email: existingUser.email,
				username: existingUser.username,
				fullname: existingUser.fullname || undefined
			};

			const jwtToken = sign(payload);
			await setAuthSession(cookies, jwtToken, existingUser);
			const callbackUrl = url.searchParams.get('callbackUrl') || '/';
			return {
				success: true,
				redirect: callbackUrl
			};
		} catch (error) {
			console.error('Login error:', error);
			return fail(500, {
				error: 'An unexpected error occurred. Please try again.'
			});
		}
	}
};
