import { json } from '@sveltejs/kit';

import { clearAuthSession, deleteBackendSession, getAuthSession } from '$lib/server/auth.js';

import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async (event) => {
    try {
        const session = await getAuthSession(event.cookies);
        const token = session?.sessionToken;

        await deleteBackendSession(token, event.locals.db);
        await clearAuthSession(event.cookies);

        event.locals.session = null;
        event.locals.user = null;
        event.locals.sessionToken = null;

        return json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        return json({ error: 'Failed to logout.' }, { status: 500 });
    }
};
