<script lang="ts">
	import { page } from '$app/state';
	import { ChevronDown, Folder, FileText, LogOut, Users, Type } from '@lucide/svelte';

	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ThemeToggle from '$lib/components/theme/ThemeToggle.svelte';

	import { useAuth } from '$lib/hooks/auth.js';
	import { UserPermissions, hasPermission } from '$lib/permissions.js';
	import { getGravatarURL } from '$lib/utils.js';
	import { m } from '$lib/paraglide/messages.js';
	import type { User } from '$lib/server/auth.js';

	const { children } = $props<{ children: () => unknown }>();

	const auth = useAuth();
	let user = $state<User | null>(null);

	$effect(() => {
		auth.user.subscribe((u) => {
			user = u;
		});
	});

	interface SidebarItem {
		title: string;
		url: string;
		icon: any; // Icon component type
		permissions: bigint[];
	}
	// Sidebar menu items configuration
	const items: SidebarItem[] = [
		{
			title: m['adminSidebar.sections.problems'](),
			url: '/admin/problems',
			icon: FileText,
			permissions: [
				UserPermissions.CREATE_PROBLEM,
				UserPermissions.EDIT_PROBLEM,
				UserPermissions.DELETE_PROBLEM
			]
		},
		{
			title: m['adminSidebar.sections.categories'](),
			url: '/admin/categories',
			icon: Folder,
			permissions: [
				UserPermissions.CREATE_PROBLEM,
				UserPermissions.EDIT_PROBLEM,
				UserPermissions.DELETE_PROBLEM
			]
		},
		{
			title: m['adminSidebar.sections.types'](),
			url: '/admin/types',
			icon: Type,
			permissions: [
				UserPermissions.CREATE_PROBLEM,
				UserPermissions.EDIT_PROBLEM,
				UserPermissions.DELETE_PROBLEM
			]
		},
		{
			title: m['adminSidebar.sections.courses'](),
			url: '/admin/courses',
			icon: Folder,
			permissions: [
				UserPermissions.CREATE_COURSE,
				UserPermissions.EDIT_COURSE,
				UserPermissions.DELETE_COURSE
			]
		},
		{
			title: m['adminSidebar.sections.users'](),
			url: '/admin/users',
			icon: Users,
			permissions: [
				UserPermissions.CREATE_USER,
				UserPermissions.EDIT_USER,
				UserPermissions.DELETE_USER
			]
		}
	];

	const displayName = $derived(() => user?.fullname || user?.username || 'User');
	const gravatar = $derived(getGravatarURL(user?.email || ''));

	// Only show if user has view management page permission
	const canViewManagement = $derived(
		user?.perms && hasPermission(user.perms, UserPermissions.VIEW_MANAGEMENT_PAGE)
	);

	// Filter items based on user permissions
	const filteredItems = $derived(
		items.filter(
			(item) =>
				item.permissions.length === 0 ||
				item.permissions.some((perm) => user?.perms && hasPermission(user.perms, perm))
		)
	);

	// Get pathname segments for breadcrumbs
	const segments = $derived(page.url.pathname.split('/').slice(2)); // Remove '' and 'admin'

	async function handleLogout() {
		try {
			await auth.logout();
		} catch (error) {
			console.error('Logout failed:', error);
		}
	}
</script>

{#if canViewManagement}
	<Sidebar.Provider>
		<!-- App Sidebar -->
		<Sidebar.Root collapsible="icon">
			<Sidebar.Content>
				<Sidebar.Group>
					<Sidebar.GroupLabel>{m['adminSidebar.sidebarName']()}</Sidebar.GroupLabel>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each filteredItems as item (item.title)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton>
										<a href={item.url} class="flex items-center gap-2">
											<item.icon />
											<span>{item.title}</span>
										</a>
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>
			</Sidebar.Content>
			<Sidebar.Footer>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Sidebar.MenuButton
							size="lg"
							class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar.Root class="h-8 w-8 rounded-lg">
								<Avatar.Image src={gravatar} alt={displayName()} />
								<Avatar.Fallback class="rounded-lg">
									{displayName().charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">{displayName()}</span>
								<span class="truncate text-xs">{user?.email}</span>
							</div>
							<ChevronDown class="ml-auto size-4" />
						</Sidebar.MenuButton>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side="bottom"
						align="end"
						sideOffset={4}
					>
						<DropdownMenu.Label class="p-0 font-normal">
							<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar.Root class="h-8 w-8 rounded-lg">
									<Avatar.Image src={gravatar} alt={displayName()} />
									<Avatar.Fallback class="rounded-lg">
										{displayName().charAt(0).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="grid flex-1 text-left text-sm leading-tight">
									<span class="truncate font-semibold">{displayName()}</span>
									<span class="truncate text-xs">{user?.email}</span>
								</div>
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<div class="p-2">
							<ThemeToggle inNavbar={false} />
						</div>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={handleLogout}>
							<LogOut class="mr-2 h-4 w-4" />
							{m['adminSidebar.logout']()}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.Footer>
		</Sidebar.Root>

		<!-- Main Content with Header -->
		<Sidebar.Inset>
			<header
				class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear"
			>
				<div class="flex items-center gap-2 px-4">
					<Sidebar.Trigger class="-ml-1" />
					<Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
					<Breadcrumb.Root>
						<Breadcrumb.List>
							<Breadcrumb.Item class="hidden md:block">
								<Breadcrumb.Link href="/admin">{m['adminSidebar.title']()}</Breadcrumb.Link>
							</Breadcrumb.Item>
							{#each segments as segment, index (segment)}
								<Breadcrumb.Separator class="hidden md:block" />
								<Breadcrumb.Item>
									{#if index === segments.length - 1}
										<Breadcrumb.Page>
											{segment.charAt(0).toUpperCase() + segment.slice(1)}
										</Breadcrumb.Page>
									{:else}
										<Breadcrumb.Link href={`/admin/${segments.slice(0, index + 1).join('/')}`}>
											{segment.charAt(0).toUpperCase() + segment.slice(1)}
										</Breadcrumb.Link>
									{/if}
								</Breadcrumb.Item>
							{/each}
						</Breadcrumb.List>
					</Breadcrumb.Root>
				</div>
			</header>
			{@render children?.()}
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}
