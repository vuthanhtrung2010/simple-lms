<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { useTheme } from 'svelte-themes';
	import { AlertCircle, CheckCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import MagicCard from '$lib/components/magicui/MagicCard.svelte';
	import type { PageProps } from './$types.js';

	let { form }: PageProps = $props();

	const theme = useTheme();

	let password = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let success = $state(false);

	// Reset form on successful navigation
	$effect(() => {
		if (!page.form) {
			password = '';
			confirmPassword = '';
			isLoading = false;
			error = '';
			success = false;
		}
	});
</script>

<svelte:head>
	<title>{m['resetPasswordPage.title']({})}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
	<Card class="w-full max-w-sm border-none p-0 shadow-none">
		<MagicCard gradientColor={theme.resolvedTheme === 'dark' ? '#262626' : '#D9D9D955'} class="p-0">
			<CardHeader class="border-b border-border p-4 [.border-b]:pb-4">
				<CardTitle>{m['resetPasswordPage.title']({})}</CardTitle>
				<CardDescription>{m['resetPasswordPage.description']({})}</CardDescription>
			</CardHeader>
			<CardContent class="p-4">
				<form
					method="POST"
					use:enhance={() => {
						isLoading = true;
						error = '';
						success = false;
						return async ({ update, result }) => {
							if (result.type === 'success' && result.data?.success) {
								success = true;
								password = '';
								confirmPassword = '';
								// Redirect to login after 2 seconds
								setTimeout(() => {
									goto('/accounts/login');
								}, 2000);
							}
							await update();
							isLoading = false;
						};
					}}
				>
					<div class="flex flex-col gap-6">
						{#if success || form?.success}
							<div
								class="flex items-center gap-2 rounded border border-green-400 bg-green-100 px-4 py-2 text-green-700"
							>
								<CheckCircle size={16} />
								<span>{m['resetPasswordPage.success']({})}</span>
							</div>
						{/if}

						{#if error || form?.error}
							<div
								class="flex items-center gap-2 rounded border border-red-400 bg-red-100 px-4 py-2 text-red-700"
							>
								<AlertCircle size={16} />
								<span>{error || form?.error}</span>
							</div>
						{/if}

						{#if !success && !form?.success}
							<div class="grid gap-2">
								<Label for="password">{m['resetPasswordPage.form.password']({})}</Label>
								<Input
									id="password"
									name="password"
									type="password"
									required
									bind:value={password}
									disabled={isLoading}
									minlength={8}
								/>
							</div>

							<div class="grid gap-2">
								<Label for="confirmPassword"
									>{m['resetPasswordPage.form.confirmPassword']({})}</Label
								>
								<Input
									id="confirmPassword"
									name="confirmPassword"
									type="password"
									required
									bind:value={confirmPassword}
									disabled={isLoading}
									minlength={8}
								/>
							</div>
						{/if}
					</div>
					<CardFooter class="mt-6 flex-col gap-2 p-0">
						{#if !success && !form?.success}
							<Button type="submit" class="w-full" disabled={isLoading}>
								{isLoading
									? m['resetPasswordPage.form.resetting']({})
									: m['resetPasswordPage.form.resetButton']({})}
							</Button>
						{/if}
					</CardFooter>
				</form>
			</CardContent>
		</MagicCard>
	</Card>
</div>
