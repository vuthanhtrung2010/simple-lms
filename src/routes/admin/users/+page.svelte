<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter
	} from '$lib/components/ui/dialog/index.js';
	import {
		PermissionLabels,
		PermissionOrder,
		PermissionCategories,
		UserPermissions,
		hasGreaterOrEqualPermissions,
		hasPermission,
		canGrantPermission
	} from '$lib/permissions.js';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import type { User } from '$lib/server/auth.js';
	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();
	let currentUser = data.currentUser;
	let users: User[] = data.users;
	let editingUser: User | null = $state(null);
	let showEditDialog = $state(false);
	let editForm: { fullname: string; email: string; password: string; permissions: bigint } = $state(
		{
			fullname: '',
			email: '',
			password: '',
			permissions: 0n
		}
	);
	// Permission toggle states for edit form
	let editPermStates: Record<string, boolean> = $state({});
	let showDeleteDialog = $state(false);
	let deletingUser: User | null = $state(null);
	// Create dialog state
	let showCreateDialog = $state(false);
	let createForm: {
		username: string;
		fullname: string;
		email: string;
		password: string;
		permissions: bigint;
	} = $state({
		username: '',
		fullname: '',
		email: '',
		password: '',
		permissions: 0n
	});
	// Permission toggle states for create form
	let createPermStates: Record<string, boolean> = $state({});

	function canUpdate(target: User) {
		const myPerms = currentUser.perms ?? 0n;
		const targetPerms = target.perms ?? 0n;
		return (
			hasPermission(myPerms, UserPermissions.EDIT_USER) &&
			!hasGreaterOrEqualPermissions(myPerms, targetPerms)
		);
	}
	function canDelete(target: User) {
		const myPerms = currentUser.perms ?? 0n;
		const targetPerms = target.perms ?? 0n;
		return (
			hasPermission(myPerms, UserPermissions.DELETE_USER) &&
			!hasGreaterOrEqualPermissions(myPerms, targetPerms)
		);
	}
	function openEdit(user: User) {
		editingUser = user;
		showEditDialog = true;
		editForm.fullname = user.fullname || '';
		editForm.email = user.email;
		editForm.password = '';
		editForm.permissions = user.perms ?? 0n;
		// Initialize toggle states
		editPermStates = {};
		(Object.keys(UserPermissions) as (keyof typeof UserPermissions)[]).forEach((key) => {
			editPermStates[key] = hasPermission(user.perms ?? 0n, UserPermissions[key]);
		});
	}
	function closeEdit() {
		showEditDialog = false;
		editingUser = null;
	}
	function openDelete(user: User) {
		deletingUser = user;
		showDeleteDialog = true;
	}
	function closeDelete() {
		showDeleteDialog = false;
		deletingUser = null;
	}
	function updateEditPerms() {
		editForm.permissions = 0n;
		(Object.keys(editPermStates) as (keyof typeof UserPermissions)[]).forEach((key) => {
			if (editPermStates[key]) {
				editForm.permissions |= UserPermissions[key];
			}
		});
	}
	function openCreate() {
		showCreateDialog = true;
		createForm = { username: '', fullname: '', email: '', password: '', permissions: 0n };
		// Initialize toggle states
		createPermStates = {};
		(Object.keys(UserPermissions) as (keyof typeof UserPermissions)[]).forEach((key) => {
			createPermStates[key] = false;
		});
	}
	function closeCreate() {
		showCreateDialog = false;
	}
	function updateCreatePerms() {
		createForm.permissions = 0n;
		(Object.keys(createPermStates) as (keyof typeof UserPermissions)[]).forEach((key) => {
			if (createPermStates[key]) {
				createForm.permissions |= UserPermissions[key];
			}
		});
	}
</script>

<div class="container mx-auto max-w-5xl py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">User Management</h1>
		{#if hasPermission(currentUser.perms ?? 0n, UserPermissions.CREATE_USER)}
			<Button onclick={openCreate}>Create User</Button>
		{/if}
	</div>
	<div class="overflow-x-auto rounded-lg border border-border bg-card">
		<table class="min-w-full divide-y divide-border">
			<thead class="bg-muted">
				<tr>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Username</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Email</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Full Name</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Permissions</th
					>
					<th
						class="px-4 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Actions</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-border">
				{#each users as user}
					<tr>
						<td class="px-4 py-2 font-mono">{user.username}</td>
						<td class="px-4 py-2">{user.email}</td>
						<td class="px-4 py-2">{user.fullname}</td>
						<td class="px-4 py-2">
							<div class="flex flex-wrap gap-1">
								{#each PermissionOrder as perm}
									{#if ((user.perms ?? 0n) & UserPermissions[perm as keyof typeof UserPermissions]) === UserPermissions[perm as keyof typeof UserPermissions]}
										<span class="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
											>{PermissionLabels[perm]}</span
										>
									{/if}
								{/each}
							</div>
						</td>
						<td class="px-4 py-2 text-center">
							<div class="flex justify-center gap-2">
								{#if canUpdate(user)}
									<Button size="sm" variant="outline" onclick={() => openEdit(user)}>Update</Button>
								{/if}
								{#if canDelete(user)}
									<Button size="sm" variant="destructive" onclick={() => openDelete(user)}
										>Delete</Button
									>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Update Dialog -->
<Dialog bind:open={showEditDialog}>
	<DialogContent class="max-h-[80vh] overflow-y-auto sm:max-h-[75vh]">
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
					await invalidate('users');
					closeEdit();
				};
			}}
		>
			<DialogHeader>
				<DialogTitle>Update User</DialogTitle>
			</DialogHeader>
			<div class="space-y-4">
				<input type="hidden" name="id" value={editingUser?.id} />
				<input type="hidden" name="permissions" value={editForm.permissions.toString()} />
				<div>
					<label class="mb-1 block" for="fullname">Full Name</label>
					<Input id="fullname" name="fullname" bind:value={editForm.fullname} required />
				</div>
				<div>
					<label class="mb-1 block" for="email">Email</label>
					<Input id="email" name="email" type="email" bind:value={editForm.email} required />
				</div>
				<div>
					<label class="mb-1 block" for="password">Password (leave empty to keep unchanged)</label>
					<Input
						id="password"
						name="password"
						type="password"
						bind:value={editForm.password}
						autocomplete="new-password"
					/>
				</div>
				<fieldset>
					<legend class="mb-2 block">Permissions</legend>
					<div class="space-y-3">
						{#each PermissionCategories as cat}
							<div class="rounded-md border p-3">
								<div class="mb-2 font-medium">{cat.label}</div>
								<div class="space-y-2">
									{#each cat.items as perm}
										{#if canGrantPermission(currentUser.perms ?? 0n, perm)}
											<div class="flex items-center justify-between">
												<label class="mr-3" for={'perm-' + perm}>{PermissionLabels[perm]}</label>
												<Switch
													id={'perm-' + perm}
													bind:checked={editPermStates[perm]}
													onCheckedChange={updateEditPerms}
												/>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</fieldset>
			</div>
			<DialogFooter class="mt-4">
				<Button type="submit">Save</Button>
				<Button type="button" variant="secondary" onclick={closeEdit}>Cancel</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<!-- Delete Dialog -->
<Dialog bind:open={showDeleteDialog}>
	<DialogContent class="max-h-[80vh] overflow-y-auto sm:max-h-[75vh]">
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
					await invalidate('users');
					closeDelete();
				};
			}}
		>
			<DialogHeader>
				<DialogTitle>Delete User</DialogTitle>
			</DialogHeader>
			<p>Are you sure you want to delete user <b>{deletingUser?.username}</b>?</p>
			<input type="hidden" name="id" value={deletingUser?.id} />
			<DialogFooter class="mt-4">
				<Button type="submit" variant="destructive">Delete</Button>
				<Button type="button" variant="secondary" onclick={closeDelete}>Cancel</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<!-- Create Dialog -->
<Dialog bind:open={showCreateDialog}>
	<DialogContent class="max-h-[80vh] overflow-y-auto sm:max-h-[75vh]">
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
					await invalidate('users');
					closeCreate();
				};
			}}
		>
			<DialogHeader>
				<DialogTitle>Create User</DialogTitle>
			</DialogHeader>
			<div class="space-y-4">
				<input type="hidden" name="permissions" value={createForm.permissions.toString()} />
				<div>
					<label class="mb-1 block" for="c-username">Username</label>
					<Input id="c-username" name="username" bind:value={createForm.username} required />
				</div>
				<div>
					<label class="mb-1 block" for="c-fullname">Full Name</label>
					<Input id="c-fullname" name="fullname" bind:value={createForm.fullname} />
				</div>
				<div>
					<label class="mb-1 block" for="c-email">Email</label>
					<Input id="c-email" name="email" type="email" bind:value={createForm.email} required />
				</div>
				<div>
					<label class="mb-1 block" for="c-password">Password</label>
					<Input
						id="c-password"
						name="password"
						type="password"
						bind:value={createForm.password}
						autocomplete="new-password"
						required
					/>
				</div>
				<fieldset>
					<legend class="mb-2 block">Permissions</legend>
					<div class="space-y-3">
						{#each PermissionCategories as cat}
							<div class="rounded-md border p-3">
								<div class="mb-2 font-medium">{cat.label}</div>
								<div class="space-y-2">
									{#each cat.items as perm}
										{#if canGrantPermission(currentUser.perms ?? 0n, perm)}
											<div class="flex items-center justify-between">
												<label class="mr-3" for={'c-perm-' + perm}>{PermissionLabels[perm]}</label>
												<Switch
													id={'c-perm-' + perm}
													bind:checked={createPermStates[perm]}
													onCheckedChange={updateCreatePerms}
												/>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</fieldset>
			</div>
			<DialogFooter class="mt-4">
				<Button type="submit">Create</Button>
				<Button type="button" variant="secondary" onclick={closeCreate}>Cancel</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
