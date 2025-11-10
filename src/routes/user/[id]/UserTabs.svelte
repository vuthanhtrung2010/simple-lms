<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils.js';

	let { userId, currentUserId } = $props();

	let pathname = $derived($page.url.pathname);

	let tabs = $derived([
		{
			name: 'About',
			href: `/user/${userId}`,
			active: pathname === `/user/${userId}`
		},
		{
			name: 'Problems',
			href: `/user/${userId}/problems`,
			active: pathname === `/user/${userId}/problems`
		},
		{
			name: 'Submissions',
			href: `/submissions?user=${userId}`,
			active: false
		}
	]);

	let isOwnProfile = $derived(currentUserId === userId);
</script>

<div class="mb-6 border-b">
	<div class="-mb-px flex flex-wrap">
		{#each tabs as tab}
			<a
				href={tab.href}
				class={cn(
					'inline-flex items-center border-b-2 px-4 py-2 text-sm font-medium',
					tab.active
						? 'border-primary text-primary'
						: 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
				)}
			>
				{tab.name}
			</a>
		{/each}

		{#if isOwnProfile}
			<a
				href="/settings/profile"
				class="ml-auto inline-flex items-center border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:border-muted-foreground hover:text-foreground"
			>
				Edit Profile
			</a>
		{/if}
	</div>
</div>
