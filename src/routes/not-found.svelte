<script lang="ts">
	import { Construction, ArrowLeft, Home } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { Button } from '$lib/components/ui/button/index.js';
	import MagicCard from '$lib/components/magicui/MagicCard.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { useTheme } from 'svelte-themes';

	const theme = useTheme();
</script>

<svelte:head>
	<title>{m['notFoundPage.title']({})}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card
		class="w-full max-w-lg border-none bg-gradient-to-br from-background to-muted/50 p-0 shadow-none"
	>
		<MagicCard gradientColor={theme.resolvedTheme === 'dark' ? '#262626' : '#D9D9D955'} class="p-0">
			<CardHeader class="p-8 text-center">
				<div class="mb-4 flex justify-center">
					<div class="relative">
						<Construction class="h-16 w-16 text-muted-foreground" />
						<div
							class="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500"
						>
							<span class="text-xs font-semibold text-white">!</span>
						</div>
					</div>
				</div>
				<CardTitle class="text-2xl font-semibold">{m['notFoundPage.title']({})}</CardTitle>
				<CardDescription class="mt-2 text-lg">{m['notFoundPage.description']({})}</CardDescription>
			</CardHeader>
			<CardContent class="px-8 pb-8">
				<div class="space-y-4 text-center">
					<p class="text-muted-foreground">{m['notFoundPage.message']({})}</p>
					<div class="flex flex-col gap-3 pt-4 sm:flex-row">
						<Button href="/" class="flex-1">
							<Home class="mr-2 h-4 w-4" />
							{m['notFoundPage.goHome']({})}
						</Button>
						<Button variant="outline" class="flex-1" onclick={() => window.history.back()}>
							<ArrowLeft class="mr-2 h-4 w-4" />
							{m['notFoundPage.goBack']({})}
						</Button>
					</div>
				</div>
			</CardContent>
		</MagicCard>
	</Card>
</div>
