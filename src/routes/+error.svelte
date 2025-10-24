<script lang="ts">
	import { useTheme } from 'svelte-themes';
	import { AlertTriangle, Home, RefreshCw } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { page } from '$app/state';

	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import MagicCard from '$lib/components/magicui/MagicCard.svelte';

	const theme = useTheme();

	function reset() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>{m['errorPage.title']({})}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card
		class="w-full max-w-lg border-none bg-gradient-to-br from-background to-muted/50 p-0 shadow-none"
	>
		<MagicCard gradientColor={theme.resolvedTheme === 'dark' ? '#262626' : '#D9D9D955'} class="p-0">
			<CardHeader class="p-8 text-center">
				<div class="mb-4 flex justify-center">
					<div class="relative">
						<AlertTriangle class="h-16 w-16 text-red-500" />
					</div>
				</div>
				<CardTitle class="text-2xl font-semibold">{m['errorPage.title']({})}</CardTitle>
				<CardDescription class="mt-2 text-lg">{m['errorPage.description']({})}</CardDescription>
			</CardHeader>
			<CardContent class="px-8 pb-8">
				<div class="space-y-4 text-center">
					<p class="text-muted-foreground">{m['errorPage.message']({})}</p>
					{#if import.meta.env.MODE !== 'production' && page.error}
						<div
							class="rounded-md border border-red-200 bg-red-50 p-3 text-left dark:border-red-800 dark:bg-red-950"
						>
							<p class="font-mono text-sm break-all text-red-600 dark:text-red-400">
								{page.error.message}
							</p>
							{#if 'digest' in page.error && (page.error as any).digest}
								<p class="mt-1 text-xs text-red-500">Error ID: {(page.error as any).digest}</p>
							{/if}
						</div>
					{/if}
					<div class="flex flex-col gap-3 pt-4 sm:flex-row">
						<Button onclick={reset} class="flex-1">
							<RefreshCw class="mr-2 h-4 w-4" />
							{m['errorPage.tryAgain']({})}
						</Button>
						<Button href="/" variant="outline" class="flex-1">
							<Home class="mr-2 h-4 w-4" />
							{m['errorPage.goHome']({})}
						</Button>
					</div>
				</div>
			</CardContent>
		</MagicCard>
	</Card>
</div>
