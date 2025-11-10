<script lang="ts">
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { useTheme } from 'svelte-themes';
	import { AlertCircle, CheckCircle } from '@lucide/svelte';
	import { Turnstile } from 'svelte-turnstile';
	import { Button } from '$lib/components/ui/button/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardAction,
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

	let email = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let success = $state(false);
	let turnstileStatus = $state<'success' | 'error' | 'expired' | 'required'>('required');

	// Reset form on successful navigation
	$effect(() => {
		if (!page.form) {
			email = '';
			isLoading = false;
			error = '';
			success = false;
			turnstileStatus = 'required';
		}
	});
</script>

<svelte:head>
	<title>{m['forgotPasswordPage.title']({})}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
	<Card class="w-full max-w-sm border-none p-0 shadow-none">
		<MagicCard gradientColor={theme.resolvedTheme === 'dark' ? '#262626' : '#D9D9D955'} class="p-0">
			<CardHeader class="border-b border-border p-4 [.border-b]:pb-4">
				<CardTitle>{m['forgotPasswordPage.title']({})}</CardTitle>
				<CardDescription>{m['forgotPasswordPage.description']({})}</CardDescription>
				<CardAction>
					<a href="/accounts/login" class={buttonVariants({ variant: 'link' })}>
						{m['forgotPasswordPage.backToLogin']({})}
					</a>
				</CardAction>
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
								email = '';
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
								<span>{m['forgotPasswordPage.success']({})}</span>
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
								<Label for="email">{m['forgotPasswordPage.form.email']({})}</Label>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder={m['forgotPasswordPage.form.emailPlaceholder']({})}
									required
									bind:value={email}
									disabled={isLoading}
								/>
							</div>

							<!-- Turnstile -->
							<div class="grid gap-2">
								<Turnstile
									theme={theme.resolvedTheme === 'dark' ? 'dark' : 'light'}
									on:error={() => {
										turnstileStatus = 'error';
										error = m['forgotPasswordPage.errors.turnstileFailed']({});
									}}
									on:expired={() => {
										turnstileStatus = 'expired';
										error = m['forgotPasswordPage.errors.turnstileExpired']({});
									}}
									on:before-interactive={() => {
										turnstileStatus = 'required';
									}}
									on:callback={() => {
										turnstileStatus = 'success';
									}}
									siteKey={PUBLIC_TURNSTILE_SITE_KEY}
								/>
							</div>
						{/if}
					</div>
					<CardFooter class="mt-6 flex-col gap-2 p-0">
						{#if !success && !form?.success}
							<Button
								type="submit"
								class="w-full"
								disabled={isLoading || turnstileStatus !== 'success'}
							>
								{isLoading
									? m['forgotPasswordPage.form.sending']({})
									: m['forgotPasswordPage.form.sendButton']({})}
							</Button>
						{/if}
					</CardFooter>
				</form>
			</CardContent>
		</MagicCard>
	</Card>
</div>
