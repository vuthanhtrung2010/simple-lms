<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { AlertCircle, Copy, Key, Plus, Trash2, CheckCircle2 } from '@lucide/svelte';
	import type { PageProps } from './$types.js';

	let { data, form }: PageProps = $props();

	let isCreateDialogOpen = $state(false);
	let isCreating = $state(false);
	let isDeletingId = $state<string | null>(null);
	let copiedKey = $state<string | null>(null);

	// Form fields
	let name = $state('');
	let expiresInDays = $state(30);

	// Reset form when dialog closes
	$effect(() => {
		if (!isCreateDialogOpen) {
			name = '';
			expiresInDays = 30;
		}
	});

	// Show success message and close dialog after successful creation
	$effect(() => {
		if (form?.success) {
			isCreateDialogOpen = false;
			isCreating = false;
		}
	});

	function copyToClipboard(key: string) {
		navigator.clipboard.writeText(key);
		copiedKey = key;
		setTimeout(() => {
			copiedKey = null;
		}, 2000);
	}

	function formatDate(timestamp: number) {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(timestamp));
	}

	function isExpired(timestamp: number) {
		return timestamp !== 0 && timestamp < Date.now();
	}
</script>

<svelte:head>
	<title>API Keys</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">API Keys</h1>
			<p class="text-muted-foreground">Manage your API keys for programmatic access</p>
		</div>

		<Dialog bind:open={isCreateDialogOpen}>
			<DialogTrigger>
				<Button>
					<Plus class="mr-2 h-4 w-4" />
					Create New Key
				</Button>
			</DialogTrigger>
			<DialogContent>
				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						isCreating = true;
						return async ({ update }) => {
							await update();
							isCreating = false;
						};
					}}
				>
					<DialogHeader>
						<DialogTitle>Create API Key</DialogTitle>
						<DialogDescription>
							Generate a new API key for programmatic access to the platform.
						</DialogDescription>
					</DialogHeader>

					<div class="space-y-4 py-4">
						<div class="space-y-2">
							<Label for="name">Key Name</Label>
							<Input
								id="name"
								name="name"
								bind:value={name}
								placeholder="e.g., My Integration"
								required
							/>
							<p class="text-xs text-muted-foreground">
								A descriptive name to help you identify this key
							</p>
						</div>

						<div class="space-y-2">
							<Label for="expiresInDays">Expires In (Days)</Label>
							<Input
								id="expiresInDays"
								name="expiresInDays"
								type="number"
								bind:value={expiresInDays}
								min="0"
								max="365"
								required
							/>
							<p class="text-xs text-muted-foreground">
								The key will expire after this many days (0 = no expiration, 1-365 = days until expiration)
							</p>
						</div>

						{#if form?.error}
							<div class="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm">
								<AlertCircle class="h-4 w-4 text-destructive" />
								<p class="text-destructive">{form.error}</p>
							</div>
						{/if}
					</div>

					<DialogFooter>
						<Button type="submit" disabled={isCreating}>
							{isCreating ? 'Creating...' : 'Create API Key'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	</div>

	<!-- Success message with new key -->
	{#if form?.success && form?.newKey}
		<Card class="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
			<CardHeader>
				<div class="flex items-center gap-2">
					<CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400" />
					<CardTitle class="text-green-900 dark:text-green-100">
						API Key Created Successfully!
					</CardTitle>
				</div>
				<CardDescription class="text-green-700 dark:text-green-300">
					Copy this key now - you won't be able to see it again!
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="flex items-center gap-2">
					<code
						class="flex-1 rounded bg-green-100 px-3 py-2 font-mono text-sm dark:bg-green-900/30"
					>
						{form.newKey}
					</code>
					<Button
						variant="outline"
						size="sm"
						onclick={() => copyToClipboard(form.newKey)}
						class="shrink-0"
					>
						{#if copiedKey === form.newKey}
							<CheckCircle2 class="h-4 w-4" />
						{:else}
							<Copy class="h-4 w-4" />
						{/if}
					</Button>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- API Keys List -->
	{#if data.keys.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Key class="mb-4 h-12 w-12 text-muted-foreground" />
				<h3 class="mb-2 text-lg font-semibold">No API Keys</h3>
				<p class="mb-4 text-center text-sm text-muted-foreground">
					You haven't created any API keys yet. Click the button above to create your first key.
				</p>
			</CardContent>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each data.keys as key (key.id)}
				{@const expired = isExpired(key.expiresAt)}
				<Card class={expired ? 'opacity-60' : ''}>
					<CardHeader>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<CardTitle>{key.name}</CardTitle>
									{#if expired}
										<Badge variant="destructive">Expired</Badge>
									{:else}
										<Badge variant="secondary">Active</Badge>
									{/if}
								</div>
								<CardDescription class="mt-2">
									Created on {formatDate(key.createdAt)}
								</CardDescription>
							</div>

							<form
								method="POST"
								action="?/delete"
								use:enhance={() => {
									isDeletingId = key.id;
									return async ({ update }) => {
										await update();
										isDeletingId = null;
									};
								}}
							>
								<input type="hidden" name="keyId" value={key.id} />
								<Button
									type="submit"
									variant="ghost"
									size="sm"
									disabled={isDeletingId === key.id}
								>
									<Trash2 class="h-4 w-4 text-destructive" />
								</Button>
							</form>
						</div>
					</CardHeader>
					<CardContent class="space-y-3">
						<div>
							<Label class="text-xs text-muted-foreground">API Key</Label>
							<div class="flex items-center gap-2">
								<code class="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
									{key.key.substring(0, 20)}...{key.key.substring(key.key.length - 8)}
								</code>
								<Button
									variant="outline"
									size="sm"
									onclick={() => copyToClipboard(key.key)}
									class="shrink-0"
								>
									{#if copiedKey === key.key}
										<CheckCircle2 class="h-4 w-4" />
									{:else}
										<Copy class="h-4 w-4" />
									{/if}
								</Button>
							</div>
						</div>

						<div>
							<Label class="text-xs text-muted-foreground">
								{key.expiresAt === 0 ? 'Expiration' : expired ? 'Expired on' : 'Expires on'}
							</Label>
							<p class={`text-sm ${expired ? 'text-destructive' : ''}`}>
								{key.expiresAt === 0 ? 'Never' : formatDate(key.expiresAt)}
							</p>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
