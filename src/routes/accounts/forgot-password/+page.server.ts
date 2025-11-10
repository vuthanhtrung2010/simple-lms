import type { PageServerLoad, Actions } from './$types.js';
import { users, passwordResetTokens } from '$lib/server/db/schema.js';
import { redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { validateTurnstile } from '$lib/server/turnstile.js';
import { eq } from 'drizzle-orm';
import { sendPasswordResetEmail } from '$lib/server/email.js';
import crypto from 'crypto';

const forgotPasswordSchema = z.object({
	email: z.string().email('Invalid email address'),
	'cf-turnstile-response': z.string().min(1, 'Captcha verification required')
});

export const load: PageServerLoad = async ({ locals }) => {
	// If user is already logged in, redirect to home
	if (locals.user) {
		redirect(307, '/');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, url, getClientAddress, locals }) => {
		try {
			const formData = await request.formData();
			const data = Object.fromEntries(formData);

			// Validate form data
			const result = forgotPasswordSchema.safeParse(data);
			if (!result.success) {
				return fail(400, {
					error: result.error?.message || 'Invalid form data',
					email: data.email as string
				});
			}

			const { email, 'cf-turnstile-response': captchaToken } = result.data;

			// Verify captcha first
			const clientIp = getClientAddress();
			const captchaResult = await validateTurnstile(captchaToken, clientIp);
			if (!captchaResult.success) {
				return fail(400, {
					error: 'Captcha verification failed',
					email
				});
			}

			// Check if user exists
			const existingUser = await locals.db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1)
				.get();

			// Always return success even if user doesn't exist (security best practice)
			if (!existingUser) {
				return {
					success: true,
					message: 'If an account exists with this email, a password reset link has been sent.'
				};
			}

			// Generate reset token
			const resetToken = crypto.randomBytes(32).toString('hex');

			// Save token to database
			await locals.db.insert(passwordResetTokens).values({
				userId: existingUser.id,
				token: resetToken,
				expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
			});

			// Generate reset URL
			const resetUrl = `${url.origin}/accounts/forgot-password/${resetToken}`;

			// Send email
			const emailResult = await sendPasswordResetEmail(email, resetUrl);

			if (!emailResult.success) {
				console.error('Failed to send password reset email:', emailResult.error);
				return fail(500, {
					error: 'Failed to send password reset email. Please try again later.',
					email
				});
			}

			return {
				success: true,
				message: 'If an account exists with this email, a password reset link has been sent.'
			};
		} catch (error) {
			console.error('Forgot password error:', error);
			return fail(500, {
				error: 'An unexpected error occurred. Please try again.'
			});
		}
	}
};
