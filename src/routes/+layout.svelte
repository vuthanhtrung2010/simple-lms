<script lang="ts">
	import '../app.css';
	import '@fortawesome/fontawesome-svg-core/styles.css';
	import { config } from '@fortawesome/fontawesome-svg-core';
	import type { LayoutProps } from "./$types.js";

	config.autoAddCss = false; // Tell Font Awesome to skip adding the CSS automatically since it's being imported above
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteTheme } from 'svelte-themes';

	import AuthProvider from '$lib/components/auth/AuthProvider.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import Navbar from '$lib/components/navigation/Navbar.svelte';
	import Loading from '$lib/components/loading.svelte';
	import { TooltipProvider } from '$lib/components/ui/tooltip/index.js';
	import AdminSidebar from '$lib/components/navigation/AdminSidebar.svelte';
	import type { Snippet } from 'svelte';

	let loading = $state(false);

	beforeNavigate(() => {
		loading = true;
	});

	afterNavigate(() => {
		loading = false;
	});

	let { children, data }: LayoutProps = $props();
</script>

<SvelteTheme defaultTheme="system">
	<AuthProvider session={data.session} user={data.user}>
		<div class="flex min-h-screen flex-col">
			{#if page.url.pathname.startsWith('/admin')}
				<TooltipProvider>
					<AdminSidebar>
						{@render children?.()}
					</AdminSidebar>
				</TooltipProvider>
			{:else}
				<Navbar />
				<main class="flex-1">
					{#if loading}
						<Loading />
					{:else}
						{@render children?.()}
					{/if}
				</main>
			{/if}
			<Footer />
		</div>
	</AuthProvider>
</SvelteTheme>
