<script lang="ts">
	import { onMount } from 'svelte';
	import { useTheme } from 'svelte-themes';
	import { Moon, Sun } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { Button } from '$lib/components/ui/button/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu/index.js';

	// Props to determine context
	const { inNavbar = true } = $props<{ inNavbar?: boolean }>();

	const theme = useTheme();
	let currentTheme = $state(theme?.theme || 'system');
	let mounted = $state(false);

	// Properly apply the dark class to document for shadcn components
	function applyTheme(value: string) {
		if (typeof document !== 'undefined') {
			if (
				value === 'dark' ||
				(value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
			) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	}

	function setTheme(value: string) {
		if (theme) {
			theme.theme = value;
			currentTheme = value;
			applyTheme(value);
		}
	}

	// Wait for client-side hydration to complete
	onMount(() => {
		mounted = true;

		// Apply theme on mount
		if (theme?.theme) {
			applyTheme(theme.theme);
		}

		// Listen for system preference changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (theme?.theme === 'system') {
				applyTheme('system');
			}
		};

		mediaQuery.addEventListener('change', handleChange);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	});

	// Initialize and update when theme changes
	$effect(() => {
		if (theme?.theme && mounted) {
			currentTheme = theme.theme;
			applyTheme(theme.theme);
		}
	});
</script>

<DropdownMenu>
	<DropdownMenuTrigger>
		<Button
			variant="ghost"
			size="icon"
			class="relative rounded-md border-none bg-transparent {inNavbar
				? 'text-zinc-100 hover:bg-zinc-800'
				: 'text-foreground hover:bg-secondary dark:text-zinc-100 dark:hover:bg-zinc-800'}"
		>
			<Sun
				class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all {inNavbar
					? 'text-zinc-100'
					: 'text-orange-500'} dark:scale-0 dark:-rotate-90"
			/>
			<Moon
				class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all {inNavbar
					? 'text-zinc-100'
					: 'text-blue-500'} dark:scale-100 dark:rotate-0"
			/>
			<span class="sr-only">Toggle theme</span>
		</Button>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end">
		<DropdownMenuItem
			onclick={() => setTheme('light')}
			class={currentTheme === 'light' ? 'bg-accent text-accent-foreground' : ''}
		>
			{m['themeToggle.light']({})}
		</DropdownMenuItem>
		<DropdownMenuItem
			onclick={() => setTheme('dark')}
			class={currentTheme === 'dark' ? 'bg-accent text-accent-foreground' : ''}
		>
			{m['themeToggle.dark']({})}
		</DropdownMenuItem>
		<DropdownMenuItem
			onclick={() => setTheme('system')}
			class={currentTheme === 'system' ? 'bg-accent text-accent-foreground' : ''}
		>
			{m['themeToggle.system']({})}
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
