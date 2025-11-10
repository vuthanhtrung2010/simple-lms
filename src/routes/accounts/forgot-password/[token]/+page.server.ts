import type { PageServerLoad, Actions } from './$types.js';
import { users, passwordResetTokens } from '$lib/server/db/schema.js';
import { redirect, fail, error } from '@sveltejs/kit';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from '$lib/server/password.js';

const resetPasswordSchema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string().min(1, 'Confirm password is required')
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});

export const load: PageServerLoad = async ({ params, locals }) => {
	const token = params.token;

	if (!token) {
		error(404, 'Token not found');
	}

	// Verify token exists and is valid
	const resetToken = await locals.db
		.select()
		.from(passwordResetTokens)
		.where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false)))
		.get();

	if (!resetToken) {
		error(404, 'Invalid or expired reset token');
	}

	// Check if token is expired
	if (resetToken.expiresAt < Date.now()) {
		error(410, 'Reset token has expired');
	}

	return {
		token
	};
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		try {
			const token = params.token;

			if (!token) {
				return fail(400, { error: 'Token not found' });
			}

			const formData = await request.formData();
			const data = Object.fromEntries(formData);

			// Validate form data
			const result = resetPasswordSchema.safeParse(data);
			if (!result.success) {
				const errors = result.error.flatten();
				return fail(400, {
					error:
						errors.fieldErrors.confirmPassword?.[0] ||
						errors.fieldErrors.password?.[0] ||
						'Invalid form data'
				});
			}

			const { password } = result.data;

			// Verify token exists and is valid
			const resetToken = await locals.db
				.select()
				.from(passwordResetTokens)
				.where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false)))
				.get();

			if (!resetToken) {
				return fail(400, { error: 'Invalid or expired reset token' });
			}

			// Check if token is expired
			if (resetToken.expiresAt < Date.now()) {
				return fail(400, { error: 'Reset token has expired' });
			}

			// Hash new password
			const passwordHash = await hashPassword(password);

			// Update user password
			await locals.db.update(users).set({ passwordHash }).where(eq(users.id, resetToken.userId));

			// Mark token as used
			await locals.db
				.update(passwordResetTokens)
				.set({ used: true })
				.where(eq(passwordResetTokens.id, resetToken.id));

			return {
				success: true
			};
		} catch (err) {
			console.error('Reset password error:', err);
			return fail(500, {
				error: 'An unexpected error occurred. Please try again.'
			});
		}
	}
};
