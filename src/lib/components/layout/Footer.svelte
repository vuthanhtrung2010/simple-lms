<script lang="ts">
	import { setLocale, getLocale } from '$lib/paraglide/runtime.js';
	import { m } from '$lib/paraglide/messages.js';
	import { ChevronDown } from '@lucide/svelte';
	import { Globe } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu/index.js';
	import { onMount } from 'svelte';

	const languages = [
		{ code: 'en', name: 'English', nativeName: 'English' },
		{ code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' }
	];

	let currentLocale = $state(getLocale());

	// Get current locale on mount
	onMount(() => {
		currentLocale = getLocale();
	});

	const changeLanguage = (locale: typeof currentLocale) => {
		if (locale === currentLocale) return;

		try {
			setLocale(locale);
			currentLocale = locale;
		} catch (error) {
			console.error('Failed to change language:', error);
		}
	};

	let currentLanguage = $derived(
		languages.find((lang) => lang.code === currentLocale) || languages[0]
	);
</script>

<footer class="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
			<!-- Credits -->
			<div class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
				<span>{m['footer.madeBy']({})}</span>
				<a
					href="https://github.com/vuthanhtrung2010"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
				>
					Trung
				</a>
			</div>

			<!-- Language Selector -->
			<div class="flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Button variant="outline" size="sm" class="gap-2 text-sm">
							<Globe class="h-4 w-4" />
							<span class="hidden sm:inline">{m['footer.language']({})}:</span>
							<span>{currentLanguage.nativeName}</span>
							<ChevronDown class="h-3 w-3 opacity-50" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" class="min-w-[160px]">
						{#each languages as language}
							<DropdownMenuItem
								onclick={() => changeLanguage(language.code as typeof currentLocale)}
								class={language.code === currentLocale
									? 'bg-accent text-accent-foreground'
									: 'cursor-pointer'}
							>
								<div class="flex flex-col">
									<span class="font-medium">{language.nativeName}</span>
									<span class="text-xs text-muted-foreground">{language.name}</span>
								</div>
							</DropdownMenuItem>
						{/each}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	</div>
</footer>
