<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { onMount, tick } from 'svelte';
	import { cn, getGravatarURL } from '$lib/utils.js';

	// Import User type from auth module
	import type { User } from '$lib/server/auth.js';
	import { useAuth } from '$lib/hooks/auth.js';
	import { UserPermissions, hasPermission } from '$lib/permissions.js';

	// Lucide icons
	import { ChevronDown } from '@lucide/svelte';
	import { FileText, Home, Code, Users, Trophy, Shield, ActivityIcon, Cog } from '@lucide/svelte';

	// Font Awesome
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faGithub } from '@fortawesome/free-brands-svg-icons';
	import { faSquarePen, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

	// UI Components
	import MobileSidebar from '$lib/components/navigation/MobileSidebar.svelte';
	import ThemeToggle from '$lib/components/theme/ThemeToggle.svelte';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
	import { navigationMenuTriggerStyle } from '$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu/index.js';
	import { Config } from '$lib/config.js';
	import { goto } from '$app/navigation';

	// Define a type for Lucide icons
	type LucideIcon =
		| typeof Home
		| typeof Code
		| typeof FileText
		| typeof Users
		| typeof Trophy
		| typeof ActivityIcon
		| typeof Shield
		| typeof ChevronDown;

	let isDropdownOpen = $state(false);

	// Get auth context
	const auth = useAuth();

	// local rune states
	let authLoading = $state<boolean>(false);
	let currentUser = $state<User | null>(null);

	// Subscribe to the stores
	$effect(() => {
		auth.isLoading.subscribe((v) => {
			authLoading = v;
		});
	});

	$effect(() => {
		auth.user.subscribe((u) => {
			currentUser = u;
		});
	});

	// Logout function
	async function logout() {
		await auth.logout();
	}

	// Navigation link elements and indicator state
	let navListEl: HTMLElement | null = $state(null);

	let indicator = $state({
		left: 0,
		width: 0,
		opacity: 0
	});

	// Derive pathname reactively - this is the KEY fix
	let pathname = $derived(page.url.pathname);

	// Update indicator position based on active link
	function updateIndicator(el: HTMLElement | null) {
		if (!el || !navListEl) {
			indicator = { ...indicator, opacity: 0 };
			return;
		}

		const containerRect = navListEl.getBoundingClientRect();
		const rect = el.getBoundingClientRect();
		// account for horizontal scroll inside the container
		const left = Math.round(rect.left - containerRect.left + navListEl.scrollLeft);
		const width = Math.round(rect.width);

		indicator = { left, width, opacity: 1 };
	}

	// Find the active link based on current path
	function computeActiveLink() {
		if (!navListEl) return null;

		const links = Array.from(navListEl.querySelectorAll('[data-nav]'));
		if (links.length === 0) return null;

		// Use the derived pathname
		let best = { el: null as HTMLElement | null, len: 0 };

		links.forEach((el) => {
			const href = el.getAttribute('data-href') || '';
			if (!href) return;

			if (href === '/') {
				// only match root exactly
				if (pathname === '/') {
					if (href.length > best.len) best = { el: el as HTMLElement, len: href.length };
				}
			} else {
				if (pathname === href || pathname?.startsWith(href)) {
					if (href.length > best.len) best = { el: el as HTMLElement, len: href.length };
				}
			}
		});

		if (best.el) return best.el;

		// fallback: if we have a link with href exactly matching pathname
		return (links.find((el) => el.getAttribute('data-href') === pathname) as HTMLElement) || null;
	}

	// Update indicator when pathname changes
	$effect(() => {
		// Access pathname to create dependency
		const _ = pathname;

		// Wait for next tick for DOM to update
		tick().then(() => {
			const active = computeActiveLink();
			updateIndicator(active);
		});
	});

	onMount(() => {
		// Initial update
		tick().then(() => {
			const active = computeActiveLink();
			updateIndicator(active);
		});

		// Update on resize
		const onResize = () => {
			const active = computeActiveLink();
			updateIndicator(active);
		};

		window.addEventListener('resize', onResize);
		return () => {
			window.removeEventListener('resize', onResize);
		};
	});
</script>

{#snippet NavLink({ href, icon, title }: { href: string; icon?: LucideIcon; title: string })}
	<a
		{href}
		data-nav="true"
		data-href={href}
		class={cn(
			'relative z-30 inline-block px-3 py-2',
			navigationMenuTriggerStyle(),
			'!hover:bg-transparent flex items-center gap-2 !bg-transparent !text-zinc-100 hover:text-zinc-100 focus:!text-zinc-100',
			'data-[active=true]:!hover:bg-transparent data-[active=true]:!bg-transparent data-[active=true]:!text-zinc-100 data-[state=open]:!text-zinc-100'
		)}
		onmouseenter={(e) => updateIndicator(e.currentTarget)}
		onmouseleave={() => updateIndicator(computeActiveLink())}
	>
		{#if icon}
			{@const IconComponent = icon}
			<IconComponent class="h-4 w-4" />
		{/if}
		{title}
	</a>
{/snippet}

<div class="relative z-50 w-full border-b border-zinc-800 bg-zinc-900">
	<div class="flex items-center justify-between">
		<div class="flex items-center">
			<!-- Mobile Sidebar Trigger -->
			<div class="px-3 py-4 lg:hidden">
				<MobileSidebar />
			</div>

			<!-- Header - hidden on mobile -->
			<div class="hidden px-6 py-4 lg:block">
				<button
					class="flex items-center text-xl font-semibold text-zinc-100 transition-colors hover:cursor-pointer hover:text-zinc-300"
					onclick={() => goto('/')}
				>
					{Config.sitename}
				</button>
			</div>

			<!-- Separator - hidden on mobile -->
			<div class="mx-6 hidden h-8 w-px bg-zinc-500 lg:block"></div>

			<!-- Navigation Menu - hidden on mobile -->
			<NavigationMenu.Root viewport={false} class="hidden bg-zinc-900 text-zinc-100 lg:flex">
				<NavigationMenu.List
					bind:ref={navListEl}
					class="relative isolate z-0 justify-start bg-zinc-900 text-zinc-100"
				>
					<!-- Animated indicator - rounded rectangle behind links -->
					<div
						aria-hidden="true"
						class="pointer-events-none absolute inset-y-0 my-auto h-9 rounded-md bg-white/10 shadow-sm transition-all duration-200 ease-out dark:bg-white/10"
						style="transform: translate3d({indicator.left}px, 0, 0); width: {indicator.width}px; opacity: {indicator.opacity}; z-index: 10;"
					></div>

					<!-- Home -->
					<NavigationMenu.Item>
						<NavigationMenu.Link>
							{#snippet child()}
								{@render NavLink({
									href: '/',
									icon: Home,
									title: m['navigation.home']({})
								})}
							{/snippet}
						</NavigationMenu.Link>
					</NavigationMenu.Item>

					<!-- Problems -->
					<NavigationMenu.Item>
						<NavigationMenu.Link>
							{#snippet child()}
								{@render NavLink({
									href: '/problems',
									icon: Code,
									title: m['navigation.problems']({})
								})}
							{/snippet}
						</NavigationMenu.Link>
					</NavigationMenu.Item>

					<!-- Submissions -->
					<NavigationMenu.Item>
						<NavigationMenu.Link>
							{#snippet child()}
								{@render NavLink({
									href: '/submissions',
									icon: FileText,
									title: m['navigation.submissions']({})
								})}
							{/snippet}
						</NavigationMenu.Link>
					</NavigationMenu.Item>

					<!-- About - with dropdown -->
					<NavigationMenu.Item>
						<NavigationMenu.Trigger
							class="!hover:bg-transparent !bg-transparent !text-zinc-100 hover:text-zinc-100 focus:!text-zinc-100 data-[state=open]:!bg-transparent data-[state=open]:!text-zinc-100"
						>
							{m['navigation.about']({})}
						</NavigationMenu.Trigger>
						<NavigationMenu.Content>
							<ul
								class="grid h-full w-[400px] grid-rows-[auto_1fr] gap-2 p-2 lg:w-[500px] lg:grid-cols-[.75fr_1fr]"
							>
								<!-- About YACPS - Featured Card -->
								<li class="row-span-2">
									<NavigationMenu.Link>
										{#snippet child()}
											<a
												href="/about"
												class="flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none select-none focus:shadow-md"
											>
												<div class="mt-4 mb-2 text-lg font-semibold">
													{m['navigation.about.title']({})}
												</div>
												<p class="text-sm leading-tight text-muted-foreground">
													{m['navigation.about.description']({})}
												</p>
											</a>
										{/snippet}
									</NavigationMenu.Link>
								</li>

								<!-- GitLab -->
								<li class="h-full">
									<NavigationMenu.Link>
										{#snippet child()}
											<a
												href="https://github.com/vuthanhtrung2010/simple-lms"
												target="_blank"
												rel="noopener noreferrer"
												class="flex h-full w-full flex-col justify-between gap-2 rounded-md p-6 transition-colors hover:bg-accent hover:text-accent-foreground"
											>
												<div class="flex items-start gap-2">
													<span class="mt-1 shrink-0">
														<FontAwesomeIcon icon={faGithub} class="h-4 w-4" />
													</span>
													<div>
														<div class="text-sm leading-none font-medium">Github</div>
														<p class="mt-1 text-xs leading-snug text-muted-foreground">
															{m['navigation.github.description']({})}
														</p>
													</div>
												</div>
											</a>
										{/snippet}
									</NavigationMenu.Link>
								</li>

								<!-- Status -->
								<li class="h-full">
									<NavigationMenu.Link>
										{#snippet child()}
											<a
												href="/status"
												class="flex h-full w-full flex-col justify-between gap-2 rounded-md p-6 transition-colors hover:bg-accent hover:text-accent-foreground"
											>
												<div class="flex items-start gap-2">
													<span class="mt-1 shrink-0">
														<ActivityIcon class="h-4 w-4" />
													</span>
													<div>
														<div class="text-sm leading-none font-medium">
															{m['navigation.status']({})}
														</div>
														<p class="mt-1 text-xs leading-snug text-muted-foreground">
															{m['navigation.statusPage.description']({})}
														</p>
													</div>
												</div>
											</a>
										{/snippet}
									</NavigationMenu.Link>
								</li>
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>
		</div>

		<!-- Auth Buttons or User Dropdown -->
		<div class="flex items-center gap-1 px-2 sm:gap-2 sm:px-3 lg:gap-4 lg:px-6">
			{#if authLoading}
				<!-- Optional: show skeleton or loading spinner -->
				<div class="h-6 w-24 animate-pulse rounded bg-zinc-700"></div>
			{:else if !currentUser}
				<!-- Not authenticated -->
				<a
					href="/accounts/login"
					class="px-2 py-2 text-xs font-medium text-zinc-100 transition-colors hover:text-zinc-300 sm:px-3 sm:text-sm lg:px-4"
				>
					{m['navigation.login']({})}
				</a>
				<span class="text-xs font-light text-zinc-500">{m['navigation.or']({})}</span>
				<a
					href="/accounts/signup"
					class="rounded-md bg-zinc-100 px-2 py-2 text-xs font-medium whitespace-nowrap text-zinc-900 transition-colors hover:bg-zinc-200 sm:px-3 sm:text-sm lg:px-4"
				>
					{m['navigation.signup']({})}
				</a>
			{:else}
				<!-- Authenticated: show dropdown -->
				<DropdownMenu bind:open={isDropdownOpen}>
					<DropdownMenuTrigger>
						<div
							class="flex items-center gap-2 rounded-md bg-transparent p-2 text-zinc-100 transition-colors outline-none hover:bg-zinc-800 focus:ring-0 focus:ring-offset-0"
						>
							<div class="flex items-center gap-2">
								{#if currentUser.email}
									<img
										src={getGravatarURL(currentUser.email)}
										alt={currentUser.username || 'User'}
										width="24"
										height="24"
										class="rounded-full border border-zinc-400"
									/>
								{/if}
								<span class="inline">
									<p class="font-semibold">
										{currentUser.fullname || currentUser.username || 'User'}
									</p>
								</span>
							</div>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 ease-in-out {isDropdownOpen
									? 'rotate-180'
									: 'rotate-0'}"
							/>
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" class="w-[170px]">
						<DropdownMenuItem>
							<a href={`/user/${currentUser.username}`} class="flex w-full items-center gap-2">
								<FontAwesomeIcon icon={faSquarePen} class="h-4 w-4" />
								{m['navigation.profile']({})}
							</a>
						</DropdownMenuItem>
						{#if currentUser?.perms && hasPermission(currentUser.perms, UserPermissions.VIEW_MANAGEMENT_PAGE)}
							<DropdownMenuItem>
								<a href="/admin" class="flex w-full items-center gap-2">
									<Cog class="h-4 w-4" />
									{m['navigation.admin']({})}
								</a>
							</DropdownMenuItem>
						{/if}
						<DropdownMenuItem
							class="flex w-full items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20"
						>
							<button onclick={logout} class="flex items-center gap-2">
								<FontAwesomeIcon icon={faRightFromBracket} class="h-4 w-4" />
								{m['navigation.signOut']({})}
							</button>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			{/if}
			<div class="ml-1 lg:ml-0">
				<ThemeToggle inNavbar={true} />
			</div>
		</div>
	</div>
</div>
