import { json } from '@sveltejs/kit';

import { getAuthSession } from '$lib/server/auth.js';

import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async (event) => {
    try {
        const session = await getAuthSession(event.cookies);

        if (!session) {
            return json({ user: null, sessionToken: null });
        }

        event.locals.session = session;
        event.locals.user = session.user;
        event.locals.sessionToken = session.sessionToken;

        return json({
            user: session.user,
            sessionToken: session.sessionToken,
            sessionExpires: session.sessionExpires
        });
    } catch (error) {
        console.error('Session fetch error:', error);
        return json({ user: null, sessionToken: null });
    }
};
