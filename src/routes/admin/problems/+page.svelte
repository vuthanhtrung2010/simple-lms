<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();

	// Delete dialog state
	let deleteDialogOpen = $state(false);
	let deleteId = $state<number | null>(null);
	let deleteTitle = $state('');
	let deleteLoading = $state(false);

	function openDeleteDialog(id: number, title: string) {
		deleteId = id;
		deleteTitle = title;
		deleteDialogOpen = true;
	}
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-3xl font-bold">Problems</h1>

	<a href="/admin/problems/create" class={buttonVariants({ variant: 'default' })}>
		Create Problem
	</a>
</div>

<!-- Problems Table -->
<div class="rounded-md border">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[200px]">ID</Table.Head>
				<Table.Head>Title</Table.Head>
				<Table.Head class="w-[100px] text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.problems as problem}
				<Table.Row>
					<Table.Cell class="font-medium">{problem.id}</Table.Cell>
					<Table.Cell>{problem.title}</Table.Cell>
					<Table.Cell class="text-right">
						<div class="flex justify-end gap-2">
							<!-- Delete Button -->
							<Button
								variant="destructive"
								size="sm"
								onclick={() => openDeleteDialog(problem.id, problem.title)}
							>
								Delete
							</Button>
						</div>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={3} class="text-center text-muted-foreground">
						No problems found. Create one to get started!
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

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
					This will permanently delete the problem "<strong>{deleteTitle}</strong>". This action
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
