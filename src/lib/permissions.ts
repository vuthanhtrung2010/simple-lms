// Bit flags for user permissions

export const UserPermissions = {
	ADMINISTRATOR: 1n << 0n,

	// Management page
	VIEW_MANAGEMENT_PAGE: 1n << 1n,

	// Problems
	CREATE_PROBLEM: 1n << 2n,
	EDIT_PROBLEM: 1n << 3n,
	DELETE_PROBLEM: 1n << 4n,

	// Courses
	CREATE_COURSE: 1n << 5n,
	EDIT_COURSE: 1n << 6n,
	DELETE_COURSE: 1n << 7n,

	// Users
	CREATE_USER: 1n << 8n,
	EDIT_USER: 1n << 9n,
	DELETE_USER: 1n << 10n
};

// Permission order for comparison (higher index = higher privilege)
export const PermissionOrder = [
	'VIEW_MANAGEMENT_PAGE',
	'CREATE_PROBLEM',
	'EDIT_PROBLEM',
	'DELETE_PROBLEM',
	'CREATE_COURSE',
	'EDIT_COURSE',
	'DELETE_COURSE',
	'CREATE_USER',
	'EDIT_USER',
	'DELETE_USER',
	'ADMINISTRATOR'
];

// Human-readable labels for each permission
export const PermissionLabels: Record<string, string> = {
	ADMINISTRATOR: 'Administrator',
	VIEW_MANAGEMENT_PAGE: 'View Management Page',
	CREATE_PROBLEM: 'Create Problem',
	EDIT_PROBLEM: 'Edit Problem',
	DELETE_PROBLEM: 'Delete Problem',
	CREATE_COURSE: 'Create Course',
	EDIT_COURSE: 'Edit Course',
	DELETE_COURSE: 'Delete Course',
	CREATE_USER: 'Create User',
	EDIT_USER: 'Edit User',
	DELETE_USER: 'Delete User'
};

// Categories for organizing permissions in UI
export const PermissionCategories: {
	key: string;
	label: string;
	items: (keyof typeof UserPermissions)[];
}[] = [
	{ key: 'management', label: 'Management', items: ['VIEW_MANAGEMENT_PAGE'] },
	{
		key: 'problems',
		label: 'Problems',
		items: ['CREATE_PROBLEM', 'EDIT_PROBLEM', 'DELETE_PROBLEM']
	},
	{ key: 'courses', label: 'Courses', items: ['CREATE_COURSE', 'EDIT_COURSE', 'DELETE_COURSE'] },
	{ key: 'users', label: 'Users', items: ['CREATE_USER', 'EDIT_USER', 'DELETE_USER'] },
	{ key: 'admin', label: 'Administrator', items: ['ADMINISTRATOR'] }
];

// Get the highest permission index a user has
export function getHighestPermissionIndex(userPermissions: bigint): number {
	for (let i = PermissionOrder.length - 1; i >= 0; i--) {
		const key = PermissionOrder[i];
		if (
			(userPermissions & UserPermissions[key as keyof typeof UserPermissions]) ===
			UserPermissions[key as keyof typeof UserPermissions]
		) {
			return i;
		}
	}
	return -1;
}

// Check if target's highest permission is greater or equal to current's
export function hasGreaterOrEqualPermissions(current: bigint, target: bigint): boolean {
	return getHighestPermissionIndex(target) >= getHighestPermissionIndex(current);
}

// Whether current user can grant a specific permission key to someone else
export function canGrantPermission(
	current: bigint,
	permKey: keyof typeof UserPermissions
): boolean {
	const bit = UserPermissions[permKey];
	// Admins can grant anything
	if ((current & UserPermissions.ADMINISTRATOR) === UserPermissions.ADMINISTRATOR) return true;
	// Otherwise only grant strictly lower-ranked permissions
	return !hasGreaterOrEqualPermissions(current, bit);
}

export function hasPermission(userPermissions: bigint, permission: bigint): boolean {
	if ((userPermissions & UserPermissions.ADMINISTRATOR) === UserPermissions.ADMINISTRATOR) {
		return true;
	}
	return (userPermissions & permission) === permission;
}
