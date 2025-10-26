<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { enhance } from '$app/forms';

	let { data } = $props();

	// Create dialog state
	let createDialogOpen = $state(false);
	let createName = $state('');
	let createLoading = $state(false);

	// Update dialog state
	let updateDialogOpen = $state(false);
	let updateId = $state<number | null>(null);
	let updateName = $state('');
	let updateLoading = $state(false);

	// Delete dialog state
	let deleteDialogOpen = $state(false);
	let deleteId = $state<number | null>(null);
	let deleteName = $state('');
	let deleteLoading = $state(false);

	function openUpdateDialog(id: number, name: string) {
		updateId = id;
		updateName = name;
		updateDialogOpen = true;
	}

	function openDeleteDialog(id: number, name: string) {
		deleteId = id;
		deleteName = name;
		deleteDialogOpen = true;
	}
</script>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Categories</h1>

		<!-- Create Category Dialog -->
		<Dialog.Root bind:open={createDialogOpen}>
			<Dialog.Trigger class={buttonVariants({ variant: 'default' })}>
				Create Category
			</Dialog.Trigger>
			<Dialog.Content class="sm:max-w-[425px]">
				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						createLoading = true;
						return async ({ result, update }) => {
							createLoading = false;
							if (result.type === 'success') {
								createDialogOpen = false;
								createName = '';
							}
							await update();
						};
					}}
				>
					<Dialog.Header>
						<Dialog.Title>Create Category</Dialog.Title>
						<Dialog.Description>Add a new category. Click save when you're done.</Dialog.Description
						>
					</Dialog.Header>
					<div class="grid gap-4 py-4">
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="create-name" class="text-right">Name</Label>
							<Input
								id="create-name"
								name="name"
								bind:value={createName}
								class="col-span-3"
								required
								disabled={createLoading}
							/>
						</div>
					</div>
					<Dialog.Footer>
						<Button type="submit" disabled={createLoading}>
							{createLoading ? 'Creating...' : 'Create'}
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<!-- Categories Table -->
	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[100px]">ID</Table.Head>
					<Table.Head>Name</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.categories as category}
					<Table.Row>
						<Table.Cell class="font-medium">{category.id}</Table.Cell>
						<Table.Cell>{category.name}</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								<!-- Update Button -->
								<Button
									variant="outline"
									size="sm"
									onclick={() => openUpdateDialog(category.id, category.name)}
								>
									Update
								</Button>

								<!-- Delete Button -->
								<Button
									variant="destructive"
									size="sm"
									onclick={() => openDeleteDialog(category.id, category.name)}
								>
									Delete
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={3} class="text-center text-muted-foreground">
							No categories found. Create one to get started!
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<!-- Update Dialog -->
<Dialog.Root bind:open={updateDialogOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				updateLoading = true;
				return async ({ result, update }) => {
					updateLoading = false;
					if (result.type === 'success') {
						updateDialogOpen = false;
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={updateId} />
			<Dialog.Header>
				<Dialog.Title>Update Category</Dialog.Title>
				<Dialog.Description
					>Make changes to the category. Click save when you're done.</Dialog.Description
				>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="update-name" class="text-right">Name</Label>
					<Input
						id="update-name"
						name="name"
						bind:value={updateName}
						class="col-span-3"
						required
						disabled={updateLoading}
					/>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={updateLoading}>
					{updateLoading ? 'Saving...' : 'Save changes'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				deleteLoading = true;
				return async ({ result, update }) => {
					deleteLoading = false;
					if (result.type === 'success') {
						deleteDialogOpen = false;
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={deleteId} />
			<AlertDialog.Header>
				<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
				<AlertDialog.Description>
					This will permanently delete the category "<strong>{deleteName}</strong>". This action
					cannot be undone.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel disabled={deleteLoading}>Cancel</AlertDialog.Cancel>
				<Button type="submit" variant="destructive" disabled={deleteLoading}>
					{deleteLoading ? 'Deleting...' : 'Delete'}
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>
