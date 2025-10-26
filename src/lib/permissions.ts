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
    DELETE_USER: 1n << 10n,
}

export function hasPermission(userPermissions: bigint, permission: bigint): boolean {
    if ((userPermissions & UserPermissions.ADMINISTRATOR) === UserPermissions.ADMINISTRATOR) {
        return true;
    }
    return (userPermissions & permission) === permission;
}