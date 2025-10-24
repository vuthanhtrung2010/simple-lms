// Bit flags for user permissions

export const UserPermissions = {
    ADMINISTRATOR: 1n << 0n,
}

export function hasPermission(userPermissions: bigint, permission: bigint): boolean {
    if ((userPermissions & UserPermissions.ADMINISTRATOR) === UserPermissions.ADMINISTRATOR) {
        return true;
    }
    return (userPermissions & permission) === permission;
}