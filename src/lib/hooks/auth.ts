import { browser } from '$app/environment';
import { invalidate } from '$app/navigation';
import { get, derived, writable, type Readable } from 'svelte/store';
import { getContext, setContext } from 'svelte';

import type { AuthSession, User } from '$lib/server/auth.js';

export interface AuthState {
	user: User | null;
	sessionToken: string | null;
	isLoading: boolean;
}

export interface AuthContextValue {
	state: Readable<AuthState>;
	user: Readable<User | null>;
	sessionToken: Readable<string | null>;
	isLoading: Readable<boolean>;
	isAuthenticated: Readable<boolean>;
	logout(): Promise<void>;
	refreshSession(): Promise<void>;
	// eslint-disable-next-line no-unused-vars
	applySession(session: AuthSession | null, user: User | null): void;
}

export const AUTH_CONTEXT_KEY = Symbol('auth-context');

export function createAuthStore(initial?: Partial<AuthState>): AuthContextValue {
	const initialState: AuthState = {
		user: initial?.user ?? null,
		sessionToken: initial?.sessionToken ?? null,
		isLoading: initial?.isLoading ?? false
	};

	const internal = writable<AuthState>(initialState);

	const user = derived(internal, ($state) => $state.user);
	const sessionToken = derived(internal, ($state) => $state.sessionToken);
	const isLoading = derived(internal, ($state) => $state.isLoading);
	const isAuthenticated = derived(internal, ($state) =>
		Boolean($state.user && $state.sessionToken)
	);

	async function logout(): Promise<void> {
		const previous = get(internal);
		internal.update((state) => ({ ...state, isLoading: true }));

		try {
			await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
		} catch (error) {
			console.error('Failed to logout:', error);
		}

		internal.set({ user: null, sessionToken: null, isLoading: false });

		if (browser && previous.sessionToken) {
			try {
				await invalidate('app:session');
			} catch (error) {
				console.error('Failed to invalidate session after logout:', error);
			}
		}
	}

	async function refreshSession(): Promise<void> {
		if (!browser) return;

		const previous = get(internal);
		internal.update((state) => ({ ...state, isLoading: true }));

		try {
			const response = await fetch('/api/auth/session', { credentials: 'include' });
			if (response.ok) {
				const data = (await response.json()) as {
					user?: User;
					sessionToken?: string;
				};
				internal.set({
					user: data.user ?? null,
					sessionToken: data.sessionToken ?? null,
					isLoading: false
				});

				if (previous.sessionToken !== (data.sessionToken ?? null)) {
					await invalidate('app:session');
				}
			} else {
				internal.set({ user: null, sessionToken: null, isLoading: false });

				if (previous.sessionToken) {
					await invalidate('app:session');
				}
			}
		} catch (error) {
			console.error('Failed to refresh session:', error);
			internal.set({ user: null, sessionToken: null, isLoading: false });

			if (previous.sessionToken) {
				await invalidate('app:session');
			}
		}
	}

	function applySession(session: AuthSession | null, userValue: User | null) {
		internal.set({
			user: userValue ?? session?.user ?? null,
			sessionToken: session?.sessionToken ?? null,
			isLoading: false
		});
	}

	return {
		state: derived(internal, ($state) => $state),
		user,
		sessionToken,
		isLoading,
		isAuthenticated,
		logout,
		refreshSession,
		applySession
	};
}

export function provideAuthContext(value: AuthContextValue) {
	setContext(AUTH_CONTEXT_KEY, value);
}

export function useAuth(): AuthContextValue {
	const context = getContext<AuthContextValue>(AUTH_CONTEXT_KEY);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
