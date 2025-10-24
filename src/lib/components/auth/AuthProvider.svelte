<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	import type { AuthSession, User } from '$lib/server/auth.js';
	import { createAuthStore, provideAuthContext } from '$lib/hooks/auth.js';

	type Props = {
		session: AuthSession | null;
		user: User | null;
	};

	const { session, user, children } = $props<Props & { children: () => unknown }>();

	const auth = createAuthStore({
		user,
		sessionToken: session?.sessionToken ?? null,
		isLoading: false
	});

	provideAuthContext(auth);

	$effect(() => {
		auth.applySession(session, user);
	});

	onMount(() => {
		if (!browser) return;
		auth.refreshSession().catch((error) => console.error('Failed to refresh auth session:', error));
	});
</script>

{@render children?.()}
