<script lang="ts">
	import { Loader2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import MagicCard from '$lib/components/magicui/MagicCard.svelte';
	import { Card, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { useTheme } from 'svelte-themes';

	const theme = useTheme();
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card
		class="w-full max-w-sm border-none bg-gradient-to-br from-background to-muted/50 p-0 shadow-none"
	>
		<MagicCard gradientColor={theme.resolvedTheme === 'dark' ? '#262626' : '#D9D9D955'} class="p-0">
			<CardHeader class="p-8 text-center">
				<div class="mb-4 flex justify-center">
					<Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
				</div>
				<CardTitle class="text-2xl font-semibold">{m['loadingPage.loading']({})}</CardTitle>
				<CardDescription class="mt-2 text-lg">{m['loadingPage.pleaseWait']({})}</CardDescription>
			</CardHeader>
		</MagicCard>
	</Card>
</div>
