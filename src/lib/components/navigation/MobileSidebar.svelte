<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { goto } from '$app/navigation';

	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faGithub } from '@fortawesome/free-brands-svg-icons';
	import {
		faHouse,
		faCode,
		faFileLines,
		faChevronDown,
		faBars,
		faCircleInfo
	} from '@fortawesome/free-solid-svg-icons';

	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetTrigger
	} from '$lib/components/ui/sheet/index.js';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '$lib/components/ui/collapsible/index.js';
	import { Config } from '$lib/config.js';

	// Navigation items
	const navigationItems = [
		{
			titleKey: 'home',
			url: '/',
			icon: faHouse
		},
		{
			titleKey: 'problems',
			url: '/problems',
			icon: faCode
		},
		{
			titleKey: 'submissions',
			url: '/submissions',
			icon: faFileLines
		},
	];

	// About section items
	const aboutItems = [
		{
			titleKey: 'status',
			url: '/status',
			icon: faCircleInfo,
			descriptionKey: 'statusPage.description'
		},
		{
			titleKey: 'github.title',
			url: 'https://github.com/vuthanhtrung2010/small-lms',
			icon: faGithub,
			descriptionKey: 'github.description'
		}
	];

	// State
	let open = $state(false);
	// This would be replaced with your actual auth logic
	const user = $state(null);

	// Filter navigation items based on authentication
	let filteredNavigationItems = $derived(
		navigationItems.filter((item) => {
			// Show Security link only for authenticated users
			if (item.titleKey === 'security') {
				return !!user;
			}
			return true;
		})
	);

	// Handle navigation and close sidebar
	function handleNavigation(url: string) {
		open = false;
		goto(url);
	}

	// Helper to safely get translation function from m
	function getNavMessage(key: string): (args: Record<string, unknown>) => string {
		if (key == 'github.title') {
			// Special case for GitHub title
			return () => 'Github';
		}
		const fullKey = `navigation.${key}`;
		// @ts-expect-error: Index signature workaround for dynamic keys
		return typeof m[fullKey] === 'function' ? m[fullKey] : () => key;
	}
</script>

<Sheet bind:open>
	<SheetTrigger>
		<Button variant="ghost" size="icon" class="text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100">
			<FontAwesomeIcon icon={faBars} class="h-5 w-5" />
			<span class="sr-only">{m['navigation.toggleNavMenu']({})}</span>
		</Button>
	</SheetTrigger>
	<SheetContent side="left" class="w-72 p-0">
		<SheetHeader class="sr-only">
			<SheetTitle>{m['navigation.navigationMenu']({})}</SheetTitle>
		</SheetHeader>
		<div class="flex h-full flex-col">
			<!-- Header -->
			<div class="flex h-16 items-center border-b px-6">
				<a href="/" class="text-xl font-semibold" onclick={() => (open = false)}
					>{Config.sitename}</a
				>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-auto py-4">
				<div class="space-y-4 px-3">
					<!-- Main Navigation -->
					<div>
						<h4 class="mb-2 px-4 text-sm font-semibold tracking-tight">
							{m['navigation.mobileMenu.navigation']({})}
						</h4>
						<div class="space-y-1">
							{#each filteredNavigationItems as item}
								<a
									href={item.url}
									onclick={(e) => {
										e.preventDefault();
										handleNavigation(item.url);
									}}
									class="hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all"
								>
									<FontAwesomeIcon icon={item.icon} class="h-4 w-4" />
									{getNavMessage(item.titleKey)({})}
								</a>
							{/each}
						</div>
					</div>

					<!-- About Section with Collapsible -->
					<div>
						<Collapsible open={true} class="group/collapsible">
							<CollapsibleTrigger>
								<Button
									variant="ghost"
									class="hover:bg-accent w-full justify-between px-3 py-2 text-sm font-semibold tracking-tight"
								>
									<span>{m['navigation.mobileMenu.about']({})}</span>
									<FontAwesomeIcon
										icon={faChevronDown}
										class="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180"
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent class="mt-1 space-y-1">
								{#each aboutItems as item}
									<a
										href={item.url}
										onclick={(e) => {
											e.preventDefault();
											handleNavigation(item.url);
										}}
										class="hover:bg-accent hover:text-accent-foreground flex items-start gap-3 rounded-lg px-6 py-2 text-sm transition-all"
										target={item.url.startsWith('http') ? '_blank' : undefined}
										rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
									>
										<span class="mt-0.5">
											<FontAwesomeIcon icon={item.icon} class="h-4 w-4" />
										</span>
										<div>
											<div class="font-medium">{getNavMessage(item.titleKey)({})}</div>
											<div class="text-muted-foreground text-xs">
												{getNavMessage(item.descriptionKey)({})}
											</div>
										</div>
									</a>
								{/each}
							</CollapsibleContent>
						</Collapsible>
					</div>
				</div>
			</div>
		</div>
	</SheetContent>
</Sheet>
