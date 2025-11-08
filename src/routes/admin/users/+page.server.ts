import type { Actions, PageServerLoad } from './$types.js';
import { users } from '$lib/server/db/schema.js';
import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { UserPermissions, hasGreaterOrEqualPermissions, hasPermission } from '$lib/permissions.js';
import { hashPassword } from '$lib/server/password.js';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('users');
	if (!locals.user) throw redirect(302, '/accounts/login');
	const allUsers = await locals.db.select().from(users).all();
	// Map permissions to perms for UI compatibility
	const mappedUsers = allUsers.map((u) => ({
		...u,
		perms: BigInt(u.permissions)
	}));
	return {
		users: mappedUsers,
		currentUser: locals.user
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.CREATE_USER))
			return fail(403, { error: 'Not authenticated' });
		const data = await request.formData();
		const username = (data.get('username') as string)?.trim();
		const fullname = (data.get('fullname') as string)?.trim() || null;
		const email = (data.get('email') as string)?.trim();
		const password = data.get('password') as string;
		const requestedPerms = BigInt((data.get('permissions') as string) || '0');
		if (!username || !email || !password) return fail(400, { error: 'Missing fields' });
		// Compute allowed perms (cannot grant perms >= current)
		let allowedPerms = 0n;
		const currentPerms = locals.user.perms;
		(Object.keys(UserPermissions) as (keyof typeof UserPermissions)[]).forEach((key) => {
			if (!hasGreaterOrEqualPermissions(currentPerms, UserPermissions[key])) {
				if ((requestedPerms & UserPermissions[key]) === UserPermissions[key]) {
					allowedPerms |= UserPermissions[key];
				}
			}
		});
		const passwordHash = await hashPassword(password);
		try {
			await locals.db.insert(users).values({
				username,
				fullname,
				email,
				passwordHash,
				permissions: allowedPerms.toString()
			});
		} catch (e) {
			return fail(400, { error: 'Failed to create user (possibly duplicate username/email)' });
		}
		return { success: true };
	},
	update: async ({ locals, request }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.EDIT_USER))
			return fail(403, { error: 'Not authenticated' });
		const data = await request.formData();
		const id = data.get('id') as string;
		const fullname = data.get('fullname') as string;
		const email = data.get('email') as string;
		const password = data.get('password') as string;
		const permissions = BigInt((data.get('permissions') as string) || '0');
		if (!id || !fullname || !email) return fail(400, { error: 'Missing fields' });
		// Fetch target user
		const [target] = await locals.db.select().from(users).where(eq(users.id, id)).all();
		if (!target) return fail(404, { error: 'User not found' });
		// Backend permission check
		if (hasGreaterOrEqualPermissions(locals.user.perms, BigInt(target.permissions))) {
			return fail(403, { error: 'Cannot edit user with greater or equal permissions' });
		}
		// Only allow toggling permissions not greater than current
		let allowedPerms = 0n;
		const currentPerms = locals.user?.perms ?? 0n;
		(Object.keys(UserPermissions) as (keyof typeof UserPermissions)[]).forEach((key) => {
			if (!hasGreaterOrEqualPermissions(currentPerms, UserPermissions[key])) {
				if ((permissions & UserPermissions[key]) === UserPermissions[key]) {
					allowedPerms |= UserPermissions[key];
				}
			}
		});
		// Always preserve any higher perms the target already had
		(Object.keys(UserPermissions) as (keyof typeof UserPermissions)[]).forEach((key) => {
			if (hasGreaterOrEqualPermissions(currentPerms, UserPermissions[key])) {
				if ((BigInt(target.permissions) & UserPermissions[key]) === UserPermissions[key]) {
					allowedPerms |= UserPermissions[key];
				}
			}
		});
		const updateData: any = { fullname, email, permissions: allowedPerms.toString() };
		if (password && password.length > 0) {
			updateData.passwordHash = await hashPassword(password);
		}
		await locals.db.update(users).set(updateData).where(eq(users.id, id));
		return { success: true };
	},
	delete: async ({ locals, request }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.DELETE_USER))
			return fail(403, { error: 'Not authenticated' });
		const data = await request.formData();
		const id = data.get('id') as string;
		if (!id) return fail(400, { error: 'Missing user id' });
		const [target] = await locals.db.select().from(users).where(eq(users.id, id)).all();
		if (!target) return fail(404, { error: 'User not found' });
		if (hasGreaterOrEqualPermissions(locals.user.perms, BigInt(target.permissions))) {
			return fail(403, { error: 'Cannot delete user with greater or equal permissions' });
		}

		// Soft delete strategy:
		// - active users have deleted = 0
		// - when deleting, set deleted to (max existing deleted for same username/email) + 1
		//   so you can reuse username/email for new accounts and delete multiple generations.
		const existing = await locals.db
			.select({ deleted: users.deleted })
			.from(users)
			.where(
				// same identity by username & email
				and(eq(users.username, target.username), eq(users.email, target.email))
			)
			.all();
		const maxDeleted = existing.reduce(
			(max, u) => (u.deleted && u.deleted > max ? u.deleted : max),
			0
		);
		await locals.db
			.update(users)
			.set({ deleted: maxDeleted + 1 })
			.where(eq(users.id, id));

		return { success: true };
	}
};
