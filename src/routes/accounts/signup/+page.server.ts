import type { PageServerLoad, Actions } from './$types.js';
import { redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { validateTurnstile } from '$lib/server/turnstile.js';
import { hashPassword } from '$lib/server/password.js';
import { users } from '$lib/server/db/schema.js';
import { eq, or } from 'drizzle-orm';

const signupSchema = z.object({
	fullname: z.string().min(1, 'Full name is required'),
	username: z
		.string()
		.min(4, 'Username must be at least 4 characters')
		.max(30, 'Username must be no more than 30 characters')
		.regex(
			/^[a-zA-Z0-9\-_.]+$/,
			'Username can only contain letters, numbers, hyphens (-), underscores (_), and dots (.)'
		),
	email: z.email('Invalid email address'),
	password: z.string().min(1, 'Password is required'),
	dateOfBirth: z.string().optional(),
	'cf-turnstile-response': z.string().min(1, 'Captcha verification required')
});

export const load: PageServerLoad = async ({ locals, url }) => {
	// If user is already logged in, redirect to home or callback URL
	if (locals.user) {
		const callbackUrl = url.searchParams.get('callbackUrl') || '/';
		redirect(302, callbackUrl);
	}

	return {
		user: locals.user || null,
		session: locals.session || null
	};
};

export const actions: Actions = {
	default: async ({ request, getClientAddress, locals }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		// Validate form data
		const result = signupSchema.safeParse(data);
		if (!result.success) {
			return fail(400, {
				error: result.error?.message || 'Invalid form data',
				formData: {
					fullname: data.fullname as string,
					username: data.username as string,
					email: data.email as string,
					dateOfBirth: data.dateOfBirth as string
				}
			});
		}

		const {
			fullname,
			username,
			email,
			password,
			dateOfBirth,
			'cf-turnstile-response': captchaToken
		} = result.data;

		// Validate captcha first
		const clientIp = getClientAddress();
		const captchaResult = await validateTurnstile(captchaToken, clientIp);
		if (!captchaResult.success) {
			return fail(400, {
				error: 'Captcha verification failed. Please try again.',
				formData: {
					fullname,
					username,
					email,
					dateOfBirth
				}
			});
		}

		// Check if the username or email already exists in the database
		const existingUser = await locals.db
			.select()
			.from(users)
			.where(or(eq(users.username, username), eq(users.email, email)))
			.limit(1);

		if (existingUser.length > 0) {
			return fail(400, {
				error: 'Username or email already exists.',
				formData: {
					fullname,
					username,
					email,
					dateOfBirth
				}
			});
		}

		// Create the new user
		const passwordHash = await hashPassword(password);
		await locals.db.insert(users).values({
			fullname,
			username,
			email,
			passwordHash,
			dob: dateOfBirth ? new Date(dateOfBirth).toISOString() : null
		});

		// Redirect to login page after successful signup
		redirect(302, '/accounts/login');
	}
};
